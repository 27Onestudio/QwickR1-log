import { describe, expect, it } from "vitest";
import {
  buildUpiUri,
  calculatePrintAmount,
  hashCustomerAccessToken,
  makeCustomerAccessToken,
  makePickupCode,
  normalizeAndValidateVpa,
  validateFixedAmount,
} from "./payment";

describe("server-authoritative UPI helpers", () => {
  it("accepts normal VPAs and rejects malformed values before saving", () => {
    expect(normalizeAndValidateVpa(" shivam@okaxis ")).toBe("shivam@okaxis");
    expect(normalizeAndValidateVpa("9820144812@paytm")).toBe("9820144812@paytm");
    for (const vpa of ["", "name", "@okaxis", "name@", "name@@okaxis", "name@x", "name@ok..axis", "name with space@okaxis"]) {
      expect(normalizeAndValidateVpa(vpa)).toBeNull();
    }
  });

  it("calculates print totals in integer paise and fixes the amount to two decimals", () => {
    expect(calculatePrintAmount("3.25", 2, 3)).toBe("19.50");
    expect(calculatePrintAmount("12", 1, 1)).toBe("12.00");
    expect(() => calculatePrintAmount("", 1, 1)).toThrow();
    expect(() => calculatePrintAmount("-1.00", 1, 1)).toThrow();
    expect(() => calculatePrintAmount("2.00", 0, 1)).toThrow();
    expect(() => validateFixedAmount("12")).toThrow();
    expect(() => validateFixedAmount("12.345")).toThrow();
  });

  it("builds the NPCI UPI URI with encoded shop name, exact amount, INR, and mandatory pickup note", () => {
    const uri = buildUpiUri({ vpa: "shivam@okaxis", shopName: "Print Shop & Copy", amount: "24.00", pickupCode: "A7B9C2" });
    expect(uri.startsWith("upi://pay?")).toBe(true);
    const params = new URLSearchParams(uri.slice("upi://pay?".length));
    expect(params.get("pa")).toBe("shivam@okaxis");
    expect(params.get("pn")).toBe("Print Shop & Copy");
    expect(params.get("am")).toBe("24.00");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tn")).toBe("QwickR1-A7B9C2");
  });

  it("rejects missing or malformed amount, VPA, or pickup code rather than generating a link", () => {
    expect(() => buildUpiUri({ vpa: "not-a-vpa", shopName: "Shop", amount: "24.00", pickupCode: "A7B9C2" })).toThrow();
    expect(() => buildUpiUri({ vpa: "name@okaxis", shopName: "Shop", amount: "", pickupCode: "A7B9C2" })).toThrow();
    expect(() => buildUpiUri({ vpa: "name@okaxis", shopName: "Shop", amount: "24.00", pickupCode: "" })).toThrow();
    expect(() => buildUpiUri({ vpa: "name@okaxis", shopName: "Shop", amount: "24.00", pickupCode: "1234567" })).toThrow();
  });

  it("issues an opaque customer token while storing only its one-way hash", () => {
    const token = makeCustomerAccessToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCustomerAccessToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCustomerAccessToken(token)).not.toBe(token);
    expect(makePickupCode()).toMatch(/^[A-Z0-9]{6}$/);
  });
});
