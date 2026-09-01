import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parsePayMongoPaidEvent,
  parsePayMongoRefundEvent,
  verifyPayMongoWebhookSignature,
} from "./paymongo-webhook";

const NOW = 1_800_000_000_000;
const TIMESTAMP = String(NOW / 1000);
const SECRET = "whsk_test_secret";

function signatureFor(body: string, mode: "test" | "live" = "test") {
  const signature = createHmac("sha256", SECRET)
    .update(`${TIMESTAMP}.${body}`)
    .digest("hex");
  return mode === "live"
    ? `t=${TIMESTAMP},te=,li=${signature}`
    : `t=${TIMESTAMP},te=${signature},li=`;
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

function standardEventPayload(amount = 4000) {
  const payload = paidPayload(amount);
  return {
    data: {
      id: "evt_test_paid_checkout",
      type: "event",
      attributes: payload.data,
    },
  };
}

function directCheckoutPayload(amount = 4000) {
  const payload = paidPayload(amount);
  return {
    ...payload.data.data,
    type: "checkout_session",
    attributes: {
      ...payload.data.data.attributes,
      livemode: false,
    },
  };
}

describe("PayMongo webhook verification", () => {
  it("verifies the timestamped test signature against the untouched body", () => {
    const body = JSON.stringify(paidPayload());
    expect(verifyPayMongoWebhookSignature(body, signatureFor(body), SECRET, "test", NOW)).toBe(true);
    expect(verifyPayMongoWebhookSignature(`${body} `, signatureFor(body), SECRET, "test", NOW)).toBe(false);
  });

  it("rejects stale and live-only signatures", () => {
    const body = JSON.stringify(paidPayload());
    const digest = signatureFor(body).split("te=")[1].split(",")[0];
    expect(verifyPayMongoWebhookSignature(body, signatureFor(body), SECRET, "test", NOW + 301_000)).toBe(false);
    expect(verifyPayMongoWebhookSignature(body, `t=${TIMESTAMP},te=,li=${digest}`, SECRET, "test", NOW)).toBe(false);
    expect(verifyPayMongoWebhookSignature(body, signatureFor(body, "live"), SECRET, "live", NOW)).toBe(true);
    expect(verifyPayMongoWebhookSignature(body, signatureFor(body), SECRET, "live", NOW)).toBe(false);
  });

  it("extracts only the trusted payment identifiers and amount", () => {
    const expected = {
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
    };

    expect(parsePayMongoPaidEvent(paidPayload(), "test")).toEqual(expected);
    expect(parsePayMongoPaidEvent(standardEventPayload(), "test")).toEqual(expected);
    expect(parsePayMongoPaidEvent(directCheckoutPayload(), "test")).toEqual(expected);
  });

  it("ignores unrelated events and rejects live or malformed paid events", () => {
    expect(parsePayMongoPaidEvent({ event_type: "send.webhook", data: { type: "payment.failed" } }, "test")).toBeNull();
    const live = paidPayload();
    live.data.livemode = true;
    expect(() => parsePayMongoPaidEvent(live, "test")).toThrow("mode did not match");
    expect(parsePayMongoPaidEvent(live, "live")).toMatchObject({
      summary: { livemode: true },
    });
    expect(() => parsePayMongoPaidEvent(paidPayload(0), "test")).toThrow("payment amount");
  });

  it("extracts a signed refund lifecycle event without trusting order metadata", () => {
    expect(parsePayMongoRefundEvent({
      data: {
        id: "evt_test_refund",
        type: "event",
        attributes: {
          type: "payment.refund.updated",
          livemode: false,
          data: {
            id: "ref_test_refund",
            type: "refund",
            attributes: {
              amount: 4000,
              currency: "PHP",
              payment_id: "pay_test_payment",
              status: "succeeded",
            },
          },
        },
      },
    }, "test")).toEqual({
      eventKey: "payment.refund.updated:evt_test_refund",
      refundId: "ref_test_refund",
      paymentId: "pay_test_payment",
      amountPhp: 40,
      status: "succeeded",
      summary: {
        livemode: false,
        event_type: "payment.refund.updated",
        refund_id: "ref_test_refund",
        payment_id: "pay_test_payment",
        amount: 40,
        currency: "PHP",
        status: "succeeded",
      },
    });
  });
});
