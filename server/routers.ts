import { randomBytes } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import {
  createJob,
  ensureShop,
  findShopByPublicCode,
  getJobForShop,
  listPrices,
  listRecentJobs,
  logPaymentLink,
  markJobOpened,
  getJobForPaymentToken,
  hasGeneratedPaymentLink,
  setCustomerPaymentMethod,
  reportCustomerUpiSent,
  confirmJobPayment,
  savePrices,
  saveSupportRequest,
  setJobStatus,
  updateShop,
} from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { buildUpiUri, calculatePrintAmount, hashCustomerAccessToken, makeCustomerAccessToken, makePickupCode, normalizeAndValidateVpa, optionalUpiLast4 } from "./payment";

const serviceKeys = ["bw_a4", "colour_a4", "bw_a3", "colour_a3"] as const;
const codeInput = z.string().trim().toUpperCase().regex(/^\d{6}$/);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  shop: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const shop = await ensureShop(ctx.user);
      const prices = await listPrices(shop.id);
      return { ...shop, prices };
    }),
    save: protectedProcedure.input(z.object({
      name: z.string().trim().min(1).max(160),
      phone: z.string().trim().max(40).default(""),
      address: z.string().trim().max(2000).default(""),
      upiVpa: z.string().trim().max(192).default(""),
      upiOwnerConfirmed: z.boolean().default(false),
    }).superRefine((input, issue) => {
      if (input.upiVpa && !normalizeAndValidateVpa(input.upiVpa)) issue.addIssue({ code: "custom", path: ["upiVpa"], message: "Enter a valid UPI ID such as name@okaxis" });
      if (input.upiVpa && !input.upiOwnerConfirmed) issue.addIssue({ code: "custom", path: ["upiOwnerConfirmed"], message: "Confirm that this UPI ID belongs to your shop" });
      if (!input.upiVpa && input.upiOwnerConfirmed) issue.addIssue({ code: "custom", path: ["upiOwnerConfirmed"], message: "Enter a UPI ID before confirming it" });
    })).mutation(async ({ ctx, input }) => {
      await ensureShop(ctx.user);
      await updateShop(ctx.user.id, { ...input, upiVpa: input.upiVpa ? normalizeAndValidateVpa(input.upiVpa)! : null });
      return { success: true };
    }),
    prices: protectedProcedure.query(async ({ ctx }) => {
      const shop = await ensureShop(ctx.user);
      return listPrices(shop.id);
    }),
    savePrices: protectedProcedure.input(z.object({
      rows: z.array(z.object({
        serviceKey: z.enum(serviceKeys),
        price: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/),
        active: z.boolean(),
      })).length(4)
        .refine(rows => new Set(rows.map(row => row.serviceKey)).size === 4, "Each print service must appear once")
        .refine(rows => rows.every(row => !row.active || Number(row.price) > 0), "Enter a positive rate before activation"),
    })).mutation(async ({ ctx, input }) => {
      const shop = await ensureShop(ctx.user);
      await savePrices(shop.id, input.rows.map(row => ({ ...row, price: Number(row.price).toFixed(2) })));
      return { success: true };
    }),
    recentJobs: protectedProcedure.query(({ ctx }) => listRecentJobs(ctx.user.id)),
    retrieve: protectedProcedure.input(z.object({ customerCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}-[A-Z0-9]{4}-[A-Z0-9]{2}$/) })).query(async ({ ctx, input }) => {
      const result = await getJobForShop(ctx.user.id, input.customerCode);
      if (!result || result.job.deletedAt) return null;
      const fileUrl = await storageGetSignedUrl(result.job.fileKey);
      await markJobOpened(ctx.user.id, result.job.id);
      const { accessTokenHash: _secretHash, ...safeJob } = result.job;
      return { ...safeJob, openedAt: result.job.openedAt ?? new Date(), fileUrl, shopName: result.shop.name };
    }),
    setJobStatus: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), status: z.enum(["new", "printing", "ready", "completed", "problem"]) })).mutation(async ({ ctx, input }) => {
      try { await setJobStatus(ctx.user.id, input.jobId, input.status); }
      catch (error) {
        if (error instanceof Error && error.message.includes("Retrieve the job")) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
        if (error instanceof Error && error.message.includes("not found")) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        throw error;
      }
      return { success: true };
    }),
    confirmPayment: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), receivedVia: z.enum(["cash", "upi"]) })).mutation(async ({ ctx, input }) => {
      try { await confirmJobPayment(ctx.user.id, input.jobId, input.receivedVia); }
      catch (error) { if (error instanceof Error && error.message.includes("not found")) throw new TRPCError({ code: "NOT_FOUND", message: error.message }); throw error; }
      return { success: true };
    }),
    submitSupport: protectedProcedure.input(z.object({
      name: z.string().trim().min(1).max(120),
      shopName: z.string().trim().min(1).max(160),
      contact: z.string().trim().min(3).max(200),
      category: z.string().trim().min(1).max(80),
      message: z.string().trim().min(8).max(5000),
      jobCode: z.string().trim().max(20).optional(),
    })).mutation(async ({ ctx, input }) => {
      const shop = await ensureShop(ctx.user);
      await saveSupportRequest(shop.id, input);
      return { success: true };
    }),
  }),
  customer: router({
    shopByCode: publicProcedure.input(z.object({ code: codeInput })).query(async ({ input }) => findShopByPublicCode(input.code)),
    paymentInfo: publicProcedure.input(z.object({ accessToken: z.string().regex(/^[a-f0-9]{64}$/) })).query(async ({ input }) => {
      const row = await getJobForPaymentToken(hashCustomerAccessToken(input.accessToken));
      if (!row || row.job.deletedAt || !row.job.pickupCode) throw new TRPCError({ code: "NOT_FOUND", message: "Payment page not found" });
      return {
        customerCode: row.job.customerCode, pickupCode: row.job.pickupCode, fileName: row.job.fileName,
        amount: row.job.paymentAmount, paymentMethod: row.job.paymentMethod, paymentStatus: row.job.paymentStatus,
        upiReferenceLast4: row.job.upiReferenceLast4, shopName: row.shop.name,
        upiAvailable: Boolean(row.shop.upiVpa && row.shop.upiOwnerConfirmed && normalizeAndValidateVpa(row.shop.upiVpa)),
      };
    }),
    selectPaymentMethod: publicProcedure.input(z.object({ accessToken: z.string().regex(/^[a-f0-9]{64}$/), method: z.enum(["cash", "upi"]) })).mutation(async ({ input }) => {
      const tokenHash = hashCustomerAccessToken(input.accessToken);
      const row = await getJobForPaymentToken(tokenHash);
      if (!row || row.job.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Payment page not found" });
      if (row.job.paymentStatus !== "unpaid") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment is awaiting shop confirmation" });
      if (input.method === "upi" && (!row.shop.upiVpa || !row.shop.upiOwnerConfirmed || !normalizeAndValidateVpa(row.shop.upiVpa))) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This shop has not configured a valid UPI ID" });
      await setCustomerPaymentMethod(tokenHash, input.method);
      return { success: true };
    }),
    paymentLink: publicProcedure.input(z.object({ accessToken: z.string().regex(/^[a-f0-9]{64}$/) })).mutation(async ({ input }) => {
      const tokenHash = hashCustomerAccessToken(input.accessToken);
      const row = await getJobForPaymentToken(tokenHash);
      if (!row || row.job.deletedAt || !row.job.pickupCode) throw new TRPCError({ code: "NOT_FOUND", message: "Payment page not found" });
      if (row.job.paymentStatus === "paid") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The counter has already confirmed payment" });
      if (row.job.paymentMethod !== "upi" || !row.shop.upiVpa || !row.shop.upiOwnerConfirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Select UPI and use a shop with a confirmed UPI ID" });
      let uri: string;
      try { uri = buildUpiUri({ vpa: row.shop.upiVpa, shopName: row.shop.name, amount: row.job.paymentAmount, pickupCode: row.job.pickupCode }); }
      catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Payment details are incomplete" }); }
      await logPaymentLink({ printJobId: row.job.id, shopId: row.shop.id, vpaUsed: row.shop.upiVpa, amount: row.job.paymentAmount, pickupCode: row.job.pickupCode });
      return { uri, amount: row.job.paymentAmount, pickupCode: row.job.pickupCode };
    }),
    reportUpiSent: publicProcedure.input(z.object({ accessToken: z.string().regex(/^[a-f0-9]{64}$/), last4: optionalUpiLast4 })).mutation(async ({ input }) => {
      const tokenHash = hashCustomerAccessToken(input.accessToken);
      const row = await getJobForPaymentToken(tokenHash);
      if (!row || row.job.deletedAt || row.job.paymentMethod !== "upi" || row.job.paymentStatus !== "unpaid") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Choose UPI and send payment before reporting it" });
      if (!(await hasGeneratedPaymentLink(row.job.id))) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Open the shop’s UPI link before reporting payment sent" });
      await reportCustomerUpiSent(tokenHash, input.last4 ?? null);
      return { success: true };
    }),
    upload: publicProcedure.input(z.object({
      shopCode: codeInput,
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
      fileBase64: z.string().min(1).max(22_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
      serviceKey: z.enum(serviceKeys),
      sides: z.enum(["single", "double"]),
      copies: z.number().int().min(1).max(100),
      note: z.string().trim().max(500).default(""),
    })).mutation(async ({ input }) => {
      const details = await findShopByPublicCode(input.shopCode);
      if (!details) throw new TRPCError({ code: "NOT_FOUND", message: "Shop code not found" });
      const shop = details.shop;
      const selectedRate = details.prices.find(rate => rate.serviceKey === input.serviceKey && rate.active);
      if (!selectedRate) throw new TRPCError({ code: "BAD_REQUEST", message: "Print service is inactive" });
      const [colour, paperSize] = input.serviceKey.split("_");
      const bytes = Buffer.from(input.fileBase64, "base64");
      if (!bytes.length || bytes.length > 15 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File must be smaller than 15 MB" });
      let pageCount = 1;
      if (input.mimeType === "application/pdf") {
        try { pageCount = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount(); }
        catch { throw new TRPCError({ code: "BAD_REQUEST", message: "This PDF file cannot be opened" }); }
        if (pageCount < 1 || pageCount > 500) throw new TRPCError({ code: "BAD_REQUEST", message: "PDF must have between 1 and 500 pages" });
      }
      const code = `${randomLetters(2)}-${randomLetters(4)}-${randomLetters(2)}`;
      const pickupCode = makePickupCode();
      const accessToken = makeCustomerAccessToken();
      const accessTokenHash = hashCustomerAccessToken(accessToken);
      const paymentAmount = calculatePrintAmount(selectedRate.price, pageCount, input.copies);
      const safeName = input.fileName.replace(/[\\/\u0000-\u001f]+/g, "_").slice(0, 180);
      const key = `shops/${shop.id}/jobs/${code}/${randomBytes(12).toString("hex")}-${safeName}`;
      const stored = await storagePut(key, bytes, input.mimeType);
      await createJob({
        shopId: shop.id,
        customerCode: code,
        fileKey: stored.key,
        fileName: safeName,
        mimeType: input.mimeType,
        fileSize: bytes.length,
        colour: colour as "bw" | "colour",
        paperSize: paperSize.toUpperCase() as "A4" | "A3",
        sides: input.sides,
        copies: input.copies,
        pageCount,
        note: input.note || null,
        pickupCode,
        accessTokenHash,
        paymentAmount,
      });
      return { customerCode: code, pickupCode, accessToken, amount: paymentAmount };
    }),
  }),
});

function randomLetters(length: number): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let output = "";
  const bytes = randomBytes(length);
  for (let index = 0; index < length; index += 1) output += chars[bytes[index]! % chars.length];
  return output;
}

export type AppRouter = typeof appRouter;
