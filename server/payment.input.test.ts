import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { optionalUpiLast4 } from "./payment";

const authenticated = {
  id: 18, openId: "payment-test", email: "shop@example.com", name: "Test shop", loginMethod: "test", role: "user" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
function caller(user: typeof authenticated | null) {
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("UPI/payment API input and access guards", () => {
  it("rejects an invalid shop VPA server-side before saving", async () => {
    await expect(caller(authenticated).shop.save({ name: "Test shop", phone: "", address: "", upiVpa: "not-a-vpa", upiOwnerConfirmed: true })).rejects.toThrow();
    await expect(caller(authenticated).shop.save({ name: "Test shop", phone: "", address: "", upiVpa: "valid@okaxis", upiOwnerConfirmed: false })).rejects.toThrow();
  });

  it("requires a four-digit UTR suffix when provided, while allowing the optional field to be absent", async () => {
    const customer = caller(null).customer;
    const token = "a".repeat(64);
    await expect(customer.reportUpiSent({ accessToken: token, last4: "123" })).rejects.toThrow();
    await expect(customer.reportUpiSent({ accessToken: token, last4: "12345" })).rejects.toThrow();
    expect(optionalUpiLast4.parse(undefined)).toBeUndefined();
    expect(optionalUpiLast4.parse(null)).toBeNull();
  });

  it("rejects malformed customer payment tokens before looking up a job", async () => {
    await expect(caller(null).customer.paymentLink({ accessToken: "short" })).rejects.toThrow();
    await expect(caller(null).customer.paymentInfo({ accessToken: "g".repeat(64) })).rejects.toThrow();
  });

  it("keeps Mark as Paid / Confirm Received behind shop authentication", async () => {
    await expect(caller(null).shop.confirmPayment({ jobId: 1, receivedVia: "cash" })).rejects.toThrow();
    await expect(caller(null).shop.setJobStatus({ jobId: 1, status: "completed" })).rejects.toThrow();
  });
});
