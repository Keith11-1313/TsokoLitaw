import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cancel: vi.fn(),
  rate: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/server-cancellation", () => ({ cancelAdminOrder: mocks.cancel }));
vi.mock("@/lib/server-orders", () => ({
  recordAdminCounterPayment: vi.fn(),
  transitionAdminOrderStatus: vi.fn(),
}));
vi.mock("@/lib/server-notifications", () => ({
  dispatchReadyForPickup: vi.fn(),
  dispatchOrderConfirmation: vi.fn(),
}));
vi.mock("@/lib/server-manual-payment", () => ({ getManualPayment: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/server-rate-limit", () => ({
  enforceMutationRateLimit: mocks.rate,
  MutationRateLimitError: class extends Error {},
}));
import { cancelAdminOrderAction } from "./actions";
const input = {
  orderId: "f5000000-0000-4000-8000-000000000001",
  expectedStatus: "READY_FOR_PICKUP" as const,
  reason: " No show ",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "verified-admin" });
});
describe("Admin cancellation action", () => {
  it("uses the authenticated identity and bounded mutation rate", async () => {
    expect((await cancelAdminOrderAction(input)).status).toBe("success");
    expect(mocks.auth).toHaveBeenCalledWith("/admin/orders");
    expect(mocks.cancel).toHaveBeenCalledWith({
      ...input,
      reason: "No show",
      adminId: "verified-admin",
    });
    expect(mocks.rate).toHaveBeenCalledWith({
      scope: "admin-order-cancel",
      userId: "verified-admin",
      maximumRequests: 30,
      windowSeconds: 300,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/inventory");
  });
  it("denies unauthorized callers before mutation", async () => {
    mocks.auth.mockRejectedValueOnce(new Error("Denied"));
    await expect(cancelAdminOrderAction(input)).rejects.toThrow("Denied");
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it.each(["", "  ", "a", "x".repeat(501)])("rejects invalid reasons", async (reason) => {
    expect((await cancelAdminOrderAction({ ...input, reason })).status).toBe("error");
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("rejects terminal states and invalid identifiers", async () => {
    expect((await cancelAdminOrderAction({ ...input, expectedStatus: "COMPLETED" })).status).toBe(
      "error",
    );
    expect((await cancelAdminOrderAction({ ...input, orderId: "invalid" })).status).toBe("error");
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("does not mutate when rate-limited", async () => {
    mocks.rate.mockRejectedValueOnce(new Error("Limited"));
    expect((await cancelAdminOrderAction(input)).status).toBe("error");
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
