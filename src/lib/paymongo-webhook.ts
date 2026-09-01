import { createHmac, timingSafeEqual } from "node:crypto";
import type { PayMongoMode } from "@/lib/paymongo-mode";

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
    livemode: boolean;
    checkout_id: string;
    payment_id: string;
    reference_number: string;
    amount: number;
    currency: "PHP";
  };
}

export interface PayMongoRefundEvent {
  eventKey: string;
  refundId: string;
  paymentId: string;
  amountPhp: number;
  status: "pending" | "processing" | "succeeded" | "failed";
  summary: {
    livemode: boolean;
    event_type: string;
    refund_id: string;
    payment_id: string;
    amount: number;
    currency: "PHP";
    status: "pending" | "processing" | "succeeded" | "failed";
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

export function verifyPayMongoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  mode: PayMongoMode,
  nowMilliseconds = Date.now(),
) {
  if (!signatureHeader || !secret) return false;
  const parts = parseSignatureHeader(signatureHeader);
  const timestamp = parts.get("t");
  const signature = parts.get(mode === "live" ? "li" : "te");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Math.floor(nowMilliseconds / 1000) - timestampSeconds);
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest();
  const provided = Buffer.from(signature, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function parsePayMongoPaidEvent(
  payload: unknown,
  mode: PayMongoMode,
): PayMongoPaidEvent | null {
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
  const expectedLivemode = mode === "live";
  if (livemode !== expectedLivemode) {
    throw new Error(`PayMongo ${mode} mode was expected but the event mode did not match.`);
  }

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
      livemode: expectedLivemode,
      checkout_id: checkoutId,
      payment_id: paymentId,
      reference_number: orderNumber,
      amount: amountPhp,
      currency: "PHP",
    },
  };
}

export function parsePayMongoRefundEvent(
  payload: unknown,
  mode: PayMongoMode,
): PayMongoRefundEvent | null {
  const envelope = asRecord(payload as PayMongoWebhookEnvelope);
  if (!envelope) return null;
  const envelopeData = asRecord(envelope.data);
  const event = envelope.event_type === "send.webhook"
    ? envelopeData
    : envelopeData?.type === "event"
      ? asRecord(envelopeData.attributes)
      : null;
  if (!event) return null;

  const eventType = event.type;
  if (!["payment.refunded", "payment.refund.updated", "refund.succeeded"].includes(String(eventType))) {
    return null;
  }
  const expectedLivemode = mode === "live";
  if (event.livemode !== expectedLivemode) {
    throw new Error(`PayMongo ${mode} mode was expected but the event mode did not match.`);
  }

  const resource = asRecord(event.data);
  const resourceAttributes = asRecord(resource?.attributes);
  let refund = resource;
  let refundAttributes = resourceAttributes;
  let paymentId: unknown = resourceAttributes?.payment_id;

  if (resource?.type === "payment") {
    paymentId = resource.id;
    const refunds = Array.isArray(resourceAttributes?.refunds) ? resourceAttributes.refunds : [];
    const refundRecords = refunds.map(asRecord);
    refund = refundRecords.find((candidate) => candidate?.type === "refund")
      ?? refundRecords.find((candidate) => candidate !== null)
      ?? null;
    refundAttributes = asRecord(refund?.attributes);
  }

  const refundId = refund?.id;
  paymentId = refundAttributes?.payment_id ?? paymentId;
  const amountCentavos = refundAttributes?.amount;
  const currency = refundAttributes?.currency;
  const rawStatus = eventType === "payment.refunded" || eventType === "refund.succeeded"
    ? "succeeded"
    : refundAttributes?.status;
  const eventId = envelopeData?.id;

  if (typeof refundId !== "string" || !/^ref_[A-Za-z0-9_-]+$/.test(refundId)) {
    throw new Error("PayMongo refund ID is invalid.");
  }
  if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9_-]+$/.test(paymentId)) {
    throw new Error("PayMongo refunded payment ID is invalid.");
  }
  if (!Number.isSafeInteger(amountCentavos) || Number(amountCentavos) <= 0 || currency !== "PHP") {
    throw new Error("PayMongo refund amount is invalid.");
  }
  if (!["pending", "processing", "succeeded", "failed"].includes(String(rawStatus))) {
    throw new Error("PayMongo refund status is invalid.");
  }

  const amountPhp = Number(amountCentavos) / 100;
  const status = rawStatus as PayMongoRefundEvent["status"];
  return {
    eventKey: typeof eventId === "string"
      ? `${String(eventType)}:${eventId}`
      : `${String(eventType)}:${refundId}:${status}`,
    refundId,
    paymentId,
    amountPhp,
    status,
    summary: {
      livemode: expectedLivemode,
      event_type: String(eventType),
      refund_id: refundId,
      payment_id: paymentId,
      amount: amountPhp,
      currency: "PHP",
      status,
    },
  };
}
