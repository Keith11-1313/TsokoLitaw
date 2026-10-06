import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPolicyContent, POLICY_VERSION } from "./policy-content";
import { createPendingOrder } from "./server-checkout";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server-commerce", () => ({ getCommerceCatalog: vi.fn(async () => ({})) }));
vi.mock("@/lib/commerce", () => ({
  priceCheckoutCart: vi.fn(() => ({ lines: [], subtotal: 40 })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      lte: () => query,
      maybeSingle: mocks.maybeSingle,
    };
    return { from: () => query, rpc: mocks.rpc };
  },
}));

const input = {
  userId: "owner",
  checkoutKey: "checkout",
  pickupWindowId: "window",
  pickupLocationId: "location",
  customerName: "Customer",
  customerNotes: "",
  termsAccepted: true,
  loyaltyRewardId: null,
  paymentMethod: "pay_at_counter" as const,
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAYMENT_MODE", "manual");
  mocks.maybeSingle.mockResolvedValue({
    data: { version: POLICY_VERSION, content: getPolicyContent() },
    error: null,
  });
  mocks.rpc.mockResolvedValue({
    data: [
      {
        created_order_id: "order",
        created_order_number: "TL001",
        created_total: 40,
        was_created: true,
        created_payment_method: "pay_at_counter",
      },
    ],
    error: null,
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("checkout policy synchronization", () => {
  it.each([
    { version: "2026-09-29", content: getPolicyContent() },
    { version: POLICY_VERSION, content: "different legal text" },
  ])("rejects unmatched stored policies without creating an order", async (data) => {
    mocks.maybeSingle.mockResolvedValue({ data, error: null });
    await expect(createPendingOrder(input)).rejects.toThrow("Checkout policies are being updated");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("records the synchronized version when content matches", async () => {
    await expect(createPendingOrder(input)).resolves.toMatchObject({ orderId: "order" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_checkout_order",
      expect.objectContaining({ terms_version_value: POLICY_VERSION }),
    );
  });

  it("still requires explicit acceptance", async () => {
    await expect(createPendingOrder({ ...input, termsAccepted: false })).rejects.toThrow(
      "Terms acceptance is required",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
