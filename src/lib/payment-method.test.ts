import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getCheckoutPaymentOptions,
  getPaymentMode,
  resolveCheckoutPaymentMethod,
} from "./payment-method";

const originalPaymentMode = process.env.PAYMENT_MODE;

afterEach(() => {
  if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE;
  else process.env.PAYMENT_MODE = originalPaymentMode;
});

describe("payment configuration", () => {
  it("fails closed when PAYMENT_MODE is missing", () => {
    delete process.env.PAYMENT_MODE;
    expect(() => getPaymentMode()).toThrow("Invalid or missing PAYMENT_MODE configuration.");
  });

  it("offers PayMongo only in automatic mode", () => {
    process.env.PAYMENT_MODE = "automatic";
    expect(getCheckoutPaymentOptions()).toEqual(["paymongo"]);
    expect(resolveCheckoutPaymentMethod("paymongo")).toBe("paymongo");
    expect(() => resolveCheckoutPaymentMethod("manual_gcash")).toThrow(
      "That payment method is unavailable.",
    );
  });

  it("offers tracked manual methods in manual mode", () => {
    process.env.PAYMENT_MODE = "manual";
    expect(getCheckoutPaymentOptions()).toEqual(["manual_gcash", "pay_at_counter"]);
    expect(resolveCheckoutPaymentMethod("manual_gcash")).toBe("manual_gcash");
    expect(resolveCheckoutPaymentMethod("pay_at_counter")).toBe("pay_at_counter");
    expect(() => resolveCheckoutPaymentMethod("paymongo")).toThrow(
      "That payment method is unavailable.",
    );
  });

  it("rejects an unsupported deployment value", () => {
    process.env.PAYMENT_MODE = "gcash";
    expect(() => getPaymentMode()).toThrow("Invalid or missing PAYMENT_MODE configuration.");
  });
});
