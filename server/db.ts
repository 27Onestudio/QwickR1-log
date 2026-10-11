import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  Price,
  pricing,
  printJobs,
  paymentLinkLogs,
  shops,
  supportRequests,
  User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { randomInt } from "node:crypto";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const defaultRates = [
  { serviceKey: "bw_a4", label: "Black & white · A4", unit: "per page" },
  { serviceKey: "colour_a4", label: "Colour · A4", unit: "per page" },
  { serviceKey: "bw_a3", label: "Black & white · A3", unit: "per page" },
  { serviceKey: "colour_a3", label: "Colour · A3", unit: "per page" },
] as const;

async function seedRates(shopId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ serviceKey: pricing.serviceKey }).from(pricing).where(eq(pricing.shopId, shopId));
  const known = new Set(existing.map(row => row.serviceKey));
  const missing = defaultRates.filter(row => !known.has(row.serviceKey));
  if (missing.length) await db.insert(pricing).values(missing.map(row => ({ ...row, shopId, price: "0.00", active: false })));
}

export async function ensureShop(user: User) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  let [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, user.id)).limit(1);
  if (!shop) {
    for (let attempt = 0; attempt < 5 && !shop; attempt += 1) {
      const publicCode = String(randomInt(100000, 1000000));
      try {
        const created = await db.insert(shops).values({
          ownerUserId: user.id,
          name: user.name?.trim() ? `${user.name.trim()}’s print shop` : "My print shop",
          publicCode,
        }).$returningId();
        [shop] = await db.select().from(shops).where(eq(shops.id, created[0]!.id)).limit(1);
      } catch (error) {
        if (attempt === 4) throw error;
      }
    }
  }
  if (!shop) throw new Error("Could not create shop settings");
  await seedRates(shop.id);
  return shop;
}

export async function updateShop(ownerUserId: number, input: { name: string; phone: string; address: string; upiVpa: string | null; upiOwnerConfirmed: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(shops).set({ name: input.name, phone: input.phone || null, address: input.address || null, upiVpa: input.upiVpa, upiOwnerConfirmed: input.upiOwnerConfirmed }).where(eq(shops.ownerUserId, ownerUserId));
}

export async function listPrices(shopId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(pricing).where(eq(pricing.shopId, shopId)).orderBy(pricing.id);
}

export async function savePrices(shopId: number, rows: Array<Pick<Price, "serviceKey" | "price" | "active">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  for (const row of rows) {
    await db.update(pricing).set({ price: row.price, active: row.active }).where(and(eq(pricing.shopId, shopId), eq(pricing.serviceKey, row.serviceKey)));
  }
}

export async function findShopByPublicCode(publicCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [shop] = await db.select().from(shops).where(eq(shops.publicCode, publicCode)).limit(1);
  if (!shop) return undefined;
  const activePrices = await db.select().from(pricing).where(and(eq(pricing.shopId, shop.id), eq(pricing.active, true)));
  return { shop: { id: shop.id, name: shop.name, publicCode: shop.publicCode }, prices: activePrices };
}

export async function createJob(input: {
  shopId: number;
  customerCode: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  colour: "bw" | "colour";
  paperSize: "A4" | "A3";
  sides: "single" | "double";
  copies: number;
  pageCount: number;
  note: string | null;
  pickupCode: string;
  accessTokenHash: string;
  paymentAmount: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const inserted = await db.insert(printJobs).values(input).$returningId();
  return Number(inserted[0]!.id);
}

export async function getJobForShop(ownerUserId: number, customerCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select({ job: printJobs, shop: shops }).from(printJobs)
    .innerJoin(shops, eq(printJobs.shopId, shops.id))
    .where(and(eq(shops.ownerUserId, ownerUserId), eq(printJobs.customerCode, customerCode), isNull(printJobs.deletedAt)))
    .limit(1);
  return result[0];
}

export async function listRecentJobs(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const shop = await ensureShopForUser(ownerUserId);
  if (!shop) return [];
  return db.select({
    id: printJobs.id, shopId: printJobs.shopId, customerCode: printJobs.customerCode, pickupCode: printJobs.pickupCode,
    fileKey: printJobs.fileKey, fileName: printJobs.fileName, mimeType: printJobs.mimeType, fileSize: printJobs.fileSize,
    colour: printJobs.colour, paperSize: printJobs.paperSize, sides: printJobs.sides, copies: printJobs.copies,
    pageCount: printJobs.pageCount, note: printJobs.note, status: printJobs.status, openedAt: printJobs.openedAt,
    paymentMethod: printJobs.paymentMethod, paymentStatus: printJobs.paymentStatus, paymentAmount: printJobs.paymentAmount,
    upiReferenceLast4: printJobs.upiReferenceLast4, createdAt: printJobs.createdAt, completedAt: printJobs.completedAt,
    deletedAt: printJobs.deletedAt,
  }).from(printJobs).where(and(eq(printJobs.shopId, shop.id), isNull(printJobs.deletedAt))).orderBy(desc(printJobs.createdAt)).limit(30);
}

async function ensureShopForUser(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, ownerUserId)).limit(1);
  return shop;
}

export async function setJobStatus(ownerUserId: number, jobId: number, status: "new" | "printing" | "ready" | "completed" | "problem") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, ownerUserId)).limit(1);
  if (!shop) throw new Error("Shop settings not found");
  const [job] = await db.select({ openedAt: printJobs.openedAt }).from(printJobs).where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id))).limit(1);
  if (!job) throw new Error("Job not found for this shop");
  if (status === "completed" && !job.openedAt) throw new Error("Retrieve the job before marking print done");
  await db.update(printJobs).set({ status, ...(status === "completed" ? { completedAt: new Date() } : {}) }).where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id)));
}

export async function markJobOpened(ownerUserId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, ownerUserId)).limit(1);
  if (!shop) throw new Error("Shop settings not found");
  await db.update(printJobs).set({ openedAt: new Date() }).where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id), isNull(printJobs.openedAt)));
}

export async function getJobForPaymentToken(accessTokenHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [row] = await db.select({ job: printJobs, shop: shops }).from(printJobs)
    .innerJoin(shops, eq(printJobs.shopId, shops.id))
    .where(and(eq(printJobs.accessTokenHash, accessTokenHash), isNull(printJobs.deletedAt))).limit(1);
  return row;
}

export async function setCustomerPaymentMethod(accessTokenHash: string, method: "cash" | "upi") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(printJobs).set({ paymentMethod: method, paymentStatus: "unpaid", upiReferenceLast4: null })
    .where(and(eq(printJobs.accessTokenHash, accessTokenHash), isNull(printJobs.deletedAt), eq(printJobs.paymentStatus, "unpaid")));
}

export async function reportCustomerUpiSent(accessTokenHash: string, last4: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(printJobs).set({ paymentStatus: "upi_sent", upiReferenceLast4: last4 })
    .where(and(eq(printJobs.accessTokenHash, accessTokenHash), isNull(printJobs.deletedAt), eq(printJobs.paymentMethod, "upi"), eq(printJobs.paymentStatus, "unpaid")));
}

export async function logPaymentLink(input: { printJobId: number; shopId: number; vpaUsed: string; amount: string; pickupCode: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(paymentLinkLogs).values(input);
}

export async function hasGeneratedPaymentLink(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [link] = await db.select({ id: paymentLinkLogs.id }).from(paymentLinkLogs).where(eq(paymentLinkLogs.printJobId, jobId)).limit(1);
  return Boolean(link);
}

export async function confirmJobPayment(ownerUserId: number, jobId: number, receivedVia: "cash" | "upi") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, ownerUserId)).limit(1);
  if (!shop) throw new Error("Shop settings not found");
  const [job] = await db.select({ paymentStatus: printJobs.paymentStatus }).from(printJobs).where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id))).limit(1);
  if (!job) throw new Error("Job not found for this shop");
  if (job.paymentStatus === "paid") return;
  await db.update(printJobs).set({ paymentStatus: "paid", paymentMethod: receivedVia }).where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id)));
}

export async function saveSupportRequest(shopId: number, input: {
  name: string;
  shopName: string;
  contact: string;
  category: string;
  message: string;
  jobCode?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(supportRequests).values({ ...input, shopId, jobCode: input.jobCode || null });
}
