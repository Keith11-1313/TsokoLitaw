import { describe, expect, it } from "vitest";
import { parseResendDeliveryEvent } from "./resend-webhook";

describe("parseResendDeliveryEvent", () => {
  it.each([
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.suppressed",
  ])("accepts the supported %s event", (eventType) => {
    expect(parseResendDeliveryEvent({
      type: eventType,
      created_at: "2026-08-30T09:00:00.000Z",
      data: { email_id: "email_123" },
    })).toEqual({
      eventType,
      createdAt: "2026-08-30T09:00:00.000Z",
      providerMessageId: "email_123",
    });
  });

  it("ignores a verified event that is unrelated to delivery state", () => {
    expect(parseResendDeliveryEvent({
      type: "email.opened",
      created_at: "2026-08-30T09:00:00.000Z",
      data: { email_id: "email_123" },
    })).toBeNull();
  });

  it.each([
    null,
    {},
    { type: "email.delivered" },
    { type: "email.delivered", created_at: "not-a-date", data: { email_id: "email_123" } },
    { type: "email.delivered", created_at: "2026-08-30T09:00:00.000Z", data: {} },
  ])("rejects malformed subscribed delivery payloads", (payload) => {
    expect(() => parseResendDeliveryEvent(payload)).toThrow();
  });
});
