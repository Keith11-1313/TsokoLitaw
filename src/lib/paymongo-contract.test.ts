import { describe, expect, it } from "vitest";
import {
  buildPayMongoCheckoutPayload,
  parsePayMongoCheckoutSession,
  phpToCentavos,
  requirePayMongoIdempotencyKey,
} from "./paymongo-contract";

describe("PayMongo checkout contract", () => {
  it("converts PHP decimal amounts to integer centavos", () => {
    expect(phpToCentavos(40)).toBe(4000);
    expect(phpToCentavos(85.5)).toBe(8550);
    expect(() => phpToCentavos(0)).toThrow("greater than zero");
  });

  it("builds a v2 test checkout request from trusted order values", () => {
    const payload = buildPayMongoCheckoutPayload({
      idempotencyKey: "payment-order-id",
      orderId: "order-id",
      orderNumber: "TL-0003",
      totalPhp: 40,
      customerName: "Jerald Esmeria",
      customerEmail: "customer@example.test",
      customerMobile: "+63 900 000 0000",
      successUrl: "http://localhost:3000/payment/success?order=order-id",
      cancelUrl: "http://localhost:3000/checkout?payment=cancelled",
    });

    expect(payload.data.attributes).toMatchObject({
      reference_number: "TL-0003",
      payment_method_types: ["qrph"],
      send_email_receipt: false,
      line_items: [{ amount: 4000, currency: "PHP", quantity: 1 }],
      metadata: { order_id: "order-id", order_number: "TL-0003" },
    });
  });

  it("rejects non-absolute redirect URLs", () => {
    expect(() => buildPayMongoCheckoutPayload({
      idempotencyKey: "payment-order-id",
      orderId: "order-id",
      orderNumber: "TL-0003",
      totalPhp: 40,
      customerName: "Customer",
      customerEmail: "customer@example.test",
      successUrl: "/payment/success",
      cancelUrl: "http://localhost:3000/checkout",
    })).toThrow("absolute URL");
  });

  it("validates stable idempotency keys for safe retries", () => {
    expect(requirePayMongoIdempotencyKey(" payment:order-id ")).toBe("payment:order-id");
    expect(() => requirePayMongoIdempotencyKey(""))
      .toThrow("idempotency key is invalid");
    expect(() => requirePayMongoIdempotencyKey("a".repeat(256)))
      .toThrow("idempotency key is invalid");
  });

  it("accepts only a test-mode PayMongo checkout response", () => {
    expect(parsePayMongoCheckoutSession({
      data: {
        id: "cs_test_session",
        attributes: {
          checkout_url: "https://checkout.paymongo.com/cs_test_session",
          livemode: false,
        },
      },
    }, "test")).toEqual({
      id: "cs_test_session",
      checkoutUrl: "https://checkout.paymongo.com/cs_test_session",
      livemode: false,
    });

    expect(() => parsePayMongoCheckoutSession({
      data: {
        id: "cs_live_session",
        attributes: {
          checkout_url: "https://checkout.paymongo.com/cs_live_session",
          livemode: true,
        },
      },
    }, "test")).toThrow("mode did not match");

    expect(parsePayMongoCheckoutSession({
      data: {
        id: "cs_live_session",
        attributes: {
          checkout_url: "https://checkout.paymongo.com/cs_live_session",
          livemode: true,
        },
      },
    }, "live")).toMatchObject({ id: "cs_live_session", livemode: true });
  });

});
