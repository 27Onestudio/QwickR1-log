import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const shops = mysqlTable(
  "shops",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id),
    name: varchar("name", { length: 160 }).notNull().default("My print shop"),
    phone: varchar("phone", { length: 40 }),
    address: text("address"),
    publicCode: varchar("publicCode", { length: 6 }).notNull(),
    upiVpa: varchar("upiVpa", { length: 192 }),
    upiOwnerConfirmed: boolean("upiOwnerConfirmed").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerUnique: uniqueIndex("shops_owner_user_unique").on(table.ownerUserId),
    publicCodeUnique: uniqueIndex("shops_public_code_unique").on(table.publicCode),
  }),
);

export const printJobs = mysqlTable(
  "printJobs",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull().references(() => shops.id),
    customerCode: varchar("customerCode", { length: 16 }).notNull(),
    pickupCode: varchar("pickupCode", { length: 6 }),
    accessTokenHash: varchar("accessTokenHash", { length: 64 }),
    fileKey: varchar("fileKey", { length: 520 }).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    fileSize: int("fileSize").notNull(),
    colour: mysqlEnum("colour", ["bw", "colour"]).notNull().default("bw"),
    paperSize: mysqlEnum("paperSize", ["A4", "A3"]).notNull().default("A4"),
    sides: mysqlEnum("sides", ["single", "double"]).notNull().default("single"),
    copies: int("copies").notNull().default(1),
    pageCount: int("pageCount").default(0),
    note: text("note"),
    status: mysqlEnum("status", ["new", "printing", "ready", "completed", "problem"]).notNull().default("new"),
    openedAt: timestamp("openedAt"),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "upi"]).notNull().default("cash"),
    paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "upi_sent", "paid"]).notNull().default("unpaid"),
    paymentAmount: decimal("paymentAmount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    upiReferenceLast4: varchar("upiReferenceLast4", { length: 4 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    deletedAt: timestamp("deletedAt"),
  },
  table => ({
    customerCodeUnique: uniqueIndex("print_jobs_customer_code_unique").on(table.customerCode),
    pickupCodeUnique: uniqueIndex("print_jobs_pickup_code_unique").on(table.pickupCode),
    accessTokenHashUnique: uniqueIndex("print_jobs_access_token_hash_unique").on(table.accessTokenHash),
    shopCreatedIndex: index("print_jobs_shop_created_idx").on(table.shopId, table.createdAt),
  }),
);

export const pricing = mysqlTable(
  "pricing",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull().references(() => shops.id),
    serviceKey: varchar("serviceKey", { length: 48 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    unit: varchar("unit", { length: 48 }).notNull().default("per page"),
    price: decimal("price", { precision: 8, scale: 2 }).notNull().default("0.00"),
    active: boolean("active").notNull().default(false),
  },
  table => ({
    shopServiceUnique: uniqueIndex("pricing_shop_service_unique").on(table.shopId, table.serviceKey),
  }),
);

export const paymentLinkLogs = mysqlTable(
  "paymentLinkLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    printJobId: int("printJobId").notNull().references(() => printJobs.id),
    shopId: int("shopId").notNull().references(() => shops.id),
    vpaUsed: varchar("vpaUsed", { length: 192 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    pickupCode: varchar("pickupCode", { length: 6 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ jobCreatedIndex: index("payment_link_job_created_idx").on(table.printJobId, table.createdAt) }),
);

export const supportRequests = mysqlTable(
  "supportRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull().references(() => shops.id),
    name: varchar("name", { length: 120 }).notNull(),
    shopName: varchar("shopName", { length: 160 }).notNull(),
    contact: varchar("contact", { length: 200 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    message: text("message").notNull(),
    jobCode: varchar("jobCode", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    shopCreatedIndex: index("support_shop_created_idx").on(table.shopId, table.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Shop = typeof shops.$inferSelect;
export type PrintJob = typeof printJobs.$inferSelect;
export type Price = typeof pricing.$inferSelect;
