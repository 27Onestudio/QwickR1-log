import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function callerForAuthenticatedShop() {
  const user: AuthenticatedUser = {
    id: 22,
    openId: "validation-shop",
    email: "shop@example.com",
    name: "Sample Shop",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

const upload = {
  shopCode: "123456",
  fileName: "print.pdf",
  mimeType: "application/pdf" as const,
  fileBase64: "UERG",
  serviceKey: "bw_a4" as const,
  sides: "single" as const,
  copies: 1,
  note: "",
};

describe("QwickR1 input validation", () => {
  it("requires an exact six-digit shop code before lookup", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => undefined } as TrpcContext["res"],
    });
    await expect(caller.customer.shopByCode({ code: "12-456" })).rejects.toThrow();
  });

  it("rejects unsupported customer upload file types", async () => {
    const caller = callerForAuthenticatedShop();
    await expect(caller.customer.upload({ ...upload, mimeType: "application/zip" as "application/pdf" })).rejects.toThrow();
  });

  it("requires a positive bounded copy count", async () => {
    const caller = callerForAuthenticatedShop();
    await expect(caller.customer.upload({ ...upload, copies: 0 })).rejects.toThrow();
    await expect(caller.customer.upload({ ...upload, copies: 101 })).rejects.toThrow();
  });

  it("rejects malformed shop-side job codes before querying private jobs", async () => {
    const caller = callerForAuthenticatedShop();
    await expect(caller.shop.retrieve({ customerCode: "123456" })).rejects.toThrow();
  });

  it("rejects negative rates and duplicate service rows before touching the database", async () => {
    const caller = callerForAuthenticatedShop();
    const negativeRows = [
      { serviceKey: "bw_a4" as const, price: "-5", active: true },
      { serviceKey: "colour_a4" as const, price: "1.00", active: true },
      { serviceKey: "bw_a3" as const, price: "2.00", active: true },
      { serviceKey: "colour_a3" as const, price: "3.00", active: true },
    ];
    const duplicateRows = [
      { serviceKey: "bw_a4" as const, price: "1.00", active: true },
      { serviceKey: "bw_a4" as const, price: "1.50", active: true },
      { serviceKey: "bw_a3" as const, price: "2.00", active: true },
      { serviceKey: "colour_a3" as const, price: "3.00", active: true },
    ];
    await expect(caller.shop.savePrices({ rows: negativeRows })).rejects.toThrow();
    await expect(caller.shop.savePrices({ rows: duplicateRows })).rejects.toThrow();
    await expect(caller.shop.savePrices({ rows: [
      { serviceKey: "bw_a4", price: "0", active: true },
      { serviceKey: "colour_a4", price: "1.00", active: true },
      { serviceKey: "bw_a3", price: "2.00", active: true },
      { serviceKey: "colour_a3", price: "3.00", active: true },
    ] })).rejects.toThrow();
  });
});
