const RESEND_DELIVERY_EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
]);

export interface ResendDeliveryEvent {
  eventType: string;
  createdAt: string;
  providerMessageId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseResendDeliveryEvent(payload: unknown): ResendDeliveryEvent | null {
  if (!isRecord(payload) || typeof payload.type !== "string") {
    throw new Error("Invalid Resend webhook payload.");
  }

  if (!RESEND_DELIVERY_EVENTS.has(payload.type)) {
    return null;
  }

  if (
    typeof payload.created_at !== "string"
    || Number.isNaN(Date.parse(payload.created_at))
    || !isRecord(payload.data)
    || typeof payload.data.email_id !== "string"
    || payload.data.email_id.length < 1
    || payload.data.email_id.length > 255
  ) {
    throw new Error("Invalid Resend delivery event.");
  }

  return {
    eventType: payload.type,
    createdAt: payload.created_at,
    providerMessageId: payload.data.email_id,
  };
}
