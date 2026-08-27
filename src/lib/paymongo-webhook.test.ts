import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parsePayMongoPaidEvent,
  verifyPayMongoTestWebhookSignature,
} from "./paymongo-webhook";

const NOW = 1_800_000_000_000;
const TIMESTAMP = String(NOW / 1000);
const SECRET = "whsk_test_secret";

function signatureFor(body: string) {
  const signature = createHmac("sha256", SECRET)
    .update(`${TIMESTAMP}.${body}`)
    .digest("hex");
  return `t=${TIMESTAMP},te=${signature},li=`;
}

function paidPayload(amount = 4000) {
  return {
    event_type: "send.webhook",
    data: {
      type: "checkout_session.payment.paid",
      livemode: false,
      data: {
        id: "cs_test_checkout",
        attributes: {
          reference_number: "TL-0003",
          metadata: { order_id: "550e8400-e29b-41d4-a716-446655440000" },
          payments: [{
            id: "pay_test_payment",
            attributes: { amount, currency: "PHP", status: "paid" },
          }],
        },
      },
    },
  };
}

describe("PayMongo webhook verification", () => {
  it("verifies the timestamped test signature against the untouched body", () => {
    const body = JSON.stringify(paidPayload());
    expect(verifyPayMongoTestWebhookSignature(body, signatureFor(body), SECRET, NOW)).toBe(true);
    expect(verifyPayMongoTestWebhookSignature(`${body} `, signatureFor(body), SECRET, NOW)).toBe(false);
  });

  it("rejects stale and live-only signatures", () => {
    const body = JSON.stringify(paidPayload());
    const digest = signatureFor(body).split("te=")[1].split(",")[0];
    expect(verifyPayMongoTestWebhookSignature(body, signatureFor(body), SECRET, NOW + 301_000)).toBe(false);
    expect(verifyPayMongoTestWebhookSignature(body, `t=${TIMESTAMP},te=,li=${digest}`, SECRET, NOW)).toBe(false);
  });

  it("extracts only the trusted payment identifiers and amount", () => {
    expect(parsePayMongoPaidEvent(paidPayload())).toEqual({
      eventKey: "checkout_session.payment.paid:cs_test_checkout:pay_test_payment",
      orderId: "550e8400-e29b-41d4-a716-446655440000",
      orderNumber: "TL-0003",
      checkoutId: "cs_test_checkout",
      paymentId: "pay_test_payment",
      amountPhp: 40,
      summary: {
        livemode: false,
        checkout_id: "cs_test_checkout",
        payment_id: "pay_test_payment",
        reference_number: "TL-0003",
        amount: 40,
        currency: "PHP",
      },
    });
  });

  it("ignores unrelated events and rejects live or malformed paid events", () => {
    expect(parsePayMongoPaidEvent({ event_type: "send.webhook", data: { type: "payment.failed" } })).toBeNull();
    const live = paidPayload();
    live.data.livemode = true;
    expect(() => parsePayMongoPaidEvent(live)).toThrow("Live PayMongo events");
    expect(() => parsePayMongoPaidEvent(paidPayload(0))).toThrow("payment amount");
  });
});
