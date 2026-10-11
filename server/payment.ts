import { createHash, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";

export const optionalUpiLast4 = z.string().regex(/^\d{4}$/).nullable().optional();

const VPA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}@[A-Za-z0-9][A-Za-z0-9.-]{1,63}$/;

export function normalizeAndValidateVpa(value: string): string | null {
  const vpa = value.trim();
  if (!VPA_PATTERN.test(vpa) || /\.\.|\.\-|\-\.|\.\.$/.test(vpa) || vpa.includes("..")) return null;
  const [handle, provider] = vpa.split("@");
  if (!handle || !provider || !/[A-Za-z]/.test(provider) || provider.startsWith(".") || provider.endsWith(".")) return null;
  return vpa;
}

export function validateFixedAmount(amount: unknown): string {
  if (typeof amount !== "string" || !/^\d{1,10}\.\d{2}$/.test(amount)) throw new Error("Invalid exact INR amount");
  const cents = Number(amount.replace(".", ""));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("Payment amount must be positive and safe");
  return amount;
}

export function calculatePrintAmount(rate: unknown, pages: number, copies: number): string {
  const fixedRate = validateFixedAmount(typeof rate === "string" && /^\d{1,10}(?:\.\d{1,2})?$/.test(rate) ? (rate.includes(".") ? rate.padEnd(rate.indexOf(".") + 3, "0") : `${rate}.00`) : "");
  if (!Number.isSafeInteger(pages) || pages < 1 || pages > 500 || !Number.isSafeInteger(copies) || copies < 1 || copies > 100) {
    throw new Error("Invalid print quantity");
  }
  const ratePaise = Number(fixedRate.replace(".", ""));
  const totalPaise = ratePaise * pages * copies;
  if (!Number.isSafeInteger(totalPaise) || totalPaise > 999999999999) throw new Error("Print amount exceeds supported limit");
  return `${Math.floor(totalPaise / 100)}.${String(totalPaise % 100).padStart(2, "0")}`;
}

export function makePickupCode(): string {
  return randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, "0");
}

export function makeCustomerAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashCustomerAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildUpiUri(input: { vpa: string; shopName: string; amount: unknown; pickupCode: string }): string {
  const vpa = normalizeAndValidateVpa(input.vpa);
  if (!vpa) throw new Error("Shop UPI VPA is invalid");
  const amount = validateFixedAmount(input.amount);
  if (!/^[A-Z0-9]{6}$/.test(input.pickupCode)) throw new Error("Six-character pickup code is required");
  const params = new URLSearchParams();
  params.set("pa", vpa);
  params.set("pn", input.shopName.trim().slice(0, 160));
  params.set("am", amount);
  params.set("cu", "INR");
  params.set("tn", `QwickR1-${input.pickupCode}`);
  return `upi://pay?${params.toString()}`;
}
