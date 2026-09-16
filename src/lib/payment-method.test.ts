import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPaymentMethod } from "./payment-method";

const originalPaymentMethod = process.env.PAYMENT_METHOD;

afterEach(() => {
  if (originalPaymentMethod === undefined) delete process.env.PAYMENT_METHOD;
  else process.env.PAYMENT_METHOD = originalPaymentMethod;
});

describe("getPaymentMethod", () => {
  it("defaults new orders to PayMongo", () => {
    delete process.env.PAYMENT_METHOD;
    expect(getPaymentMethod()).toBe("paymongo");
  });

  it.each(["paymongo", "manual_gcash"] as const)("accepts %s", (method) => {
    process.env.PAYMENT_METHOD = method;
    expect(getPaymentMethod()).toBe(method);
  });

  it("rejects an unsupported deployment value", () => {
    process.env.PAYMENT_METHOD = "gcash";
    expect(() => getPaymentMethod()).toThrow("Invalid PAYMENT_METHOD configuration.");
  });
});
