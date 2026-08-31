import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifySignature: vi.fn(),
  parsePaidEvent: vi.fn(),
  parseRefundEvent: vi.fn(),
  createAdminClient: vi.fn(),
  dispatchOrderConfirmation: vi.fn(),
  dispatchPendingNotifications: vi.fn(),
}));

vi.mock("@/lib/paymongo-webhook", () => ({
  verifyPayMongoTestWebhookSignature: mocks.verifySignature,
  parsePayMongoPaidEvent: mocks.parsePaidEvent,
  parsePayMongoRefundEvent: mocks.parseRefundEvent,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: mocks.createAdminClient,
}));
vi.mock("@/lib/server-notifications", () => ({
  dispatchOrderConfirmation: mocks.dispatchOrderConfirmation,
  dispatchPendingNotifications: mocks.dispatchPendingNotifications,
}));

import { POST } from "@/app/api/webhooks/paymongo/route";

const paidEvent = {
  eventKey: "checkout_session.payment.paid:cs_test_dev:pay_test_dev",
  orderId: "00000000-0000-4000-8000-000000000001",
  orderNumber: "TL-0001",
  checkoutId: "cs_test_dev",
  paymentId: "pay_test_dev",
  amountPhp: 40,
  summary: { livemode: false },
};

function request() {
  return new Request("https://tsokolitaw.vercel.app/api/webhooks/paymongo", {
    method: "POST",
    headers: { "paymongo-signature": "test-signature" },
    body: JSON.stringify({ data: { id: "evt_test" } }),
  });
}

function adminClient(localPayment: { id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: localPayment, error: null });
  const query = {
    eq: vi.fn(),
    maybeSingle,
  };
  query.eq.mockReturnValue(query);
  const select = vi.fn().mockReturnValue(query);
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  return { from: vi.fn().mockReturnValue({ select }), rpc };
}

describe("PayMongo webhook environment routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMONGO_WEBHOOK_SECRET = "whsk_test";
    mocks.verifySignature.mockReturnValue(true);
    mocks.parsePaidEvent.mockReturnValue(paidEvent);
    mocks.parseRefundEvent.mockReturnValue(null);
  });

  it("acknowledges a valid event owned by the other environment", async () => {
    const client = adminClient(null);
    mocks.createAdminClient.mockReturnValue(client);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      processed: false,
      ignored: "other_environment",
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("still applies strict processing to a locally owned checkout", async () => {
    const client = adminClient({ id: "payment-id" });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, processed: true });
    expect(client.rpc).toHaveBeenCalledWith("process_paymongo_paid_event", expect.objectContaining({
      checkout_id: "cs_test_dev",
      paid_amount: 40,
    }));
  });
});
