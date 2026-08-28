import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PayMongoWebhookEnvelope {
  event_type?: unknown;
  data?: unknown;
}

export interface PayMongoPaidEvent {
  eventKey: string;
  orderId: string;
  orderNumber: string;
  checkoutId: string;
  paymentId: string;
  amountPhp: number;
  summary: {
    livemode: false;
    checkout_id: string;
    payment_id: string;
    reference_number: string;
    amount: number;
    currency: "PHP";
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseSignatureHeader(header: string) {
  const parts = new Map<string, string>();
  for (const segment of header.split(",")) {
    const separator = segment.indexOf("=");
    if (separator < 1) continue;
    parts.set(segment.slice(0, separator).trim(), segment.slice(separator + 1).trim());
  }
  return parts;
}

export function verifyPayMongoTestWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowMilliseconds = Date.now(),
) {
  if (!signatureHeader || !secret) return false;
  const parts = parseSignatureHeader(signatureHeader);
  const timestamp = parts.get("t");
  const testSignature = parts.get("te");
  if (!timestamp || !testSignature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(testSignature)) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Math.floor(nowMilliseconds / 1000) - timestampSeconds);
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest();
  const provided = Buffer.from(testSignature, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function parsePayMongoPaidEvent(payload: unknown): PayMongoPaidEvent | null {
  const envelope = asRecord(payload as PayMongoWebhookEnvelope);
  if (!envelope) return null;

  const envelopeData = asRecord(envelope.data);
  const event = envelope.event_type === "send.webhook"
    ? envelopeData
    : envelopeData?.type === "event"
      ? asRecord(envelopeData.attributes)
      : null;
  const isDirectCheckout = typeof envelope.id === "string"
    && envelope.id.startsWith("cs_")
    && (envelope.type === "checkout_session" || envelope.type === "checkout_session.payment.paid");

  if (event && event.type !== "checkout_session.payment.paid") return null;
  if (!event && !isDirectCheckout) return null;

  const session = isDirectCheckout ? envelope : asRecord(event?.data);
  const attributes = asRecord(session?.attributes);
  const livemode = event?.livemode ?? attributes?.livemode;
  if (livemode !== false) throw new Error("Live PayMongo events are not accepted in test mode.");

  const metadata = asRecord(attributes?.metadata);
  const payments = Array.isArray(attributes?.payments) ? attributes.payments : [];
  const paidPayment = payments
    .map(asRecord)
    .find((payment) => asRecord(payment?.attributes)?.status === "paid");
  const paymentAttributes = asRecord(paidPayment?.attributes);

  const checkoutId = session?.id;
  const orderId = metadata?.order_id;
  const orderNumber = attributes?.reference_number;
  const paymentId = paidPayment?.id;
  const amountCentavos = paymentAttributes?.amount;
  const currency = paymentAttributes?.currency;

  if (typeof checkoutId !== "string" || !/^cs_[A-Za-z0-9_-]+$/.test(checkoutId)) {
    throw new Error("PayMongo checkout ID is invalid.");
  }
  if (typeof orderId !== "string" || !UUID_PATTERN.test(orderId)) {
    throw new Error("PayMongo order metadata is invalid.");
  }
  if (typeof orderNumber !== "string" || !/^TL-[0-9]{4,}$/.test(orderNumber)) {
    throw new Error("PayMongo order reference is invalid.");
  }
  if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9_-]+$/.test(paymentId)) {
    throw new Error("PayMongo payment ID is invalid.");
  }
  if (!Number.isSafeInteger(amountCentavos) || Number(amountCentavos) <= 0 || currency !== "PHP") {
    throw new Error("PayMongo payment amount is invalid.");
  }

  const amountPhp = Number(amountCentavos) / 100;
  return {
    eventKey: `checkout_session.payment.paid:${checkoutId}:${paymentId}`,
    orderId,
    orderNumber,
    checkoutId,
    paymentId,
    amountPhp,
    summary: {
      livemode: false,
      checkout_id: checkoutId,
      payment_id: paymentId,
      reference_number: orderNumber,
      amount: amountPhp,
      currency: "PHP",
    },
  };
}
