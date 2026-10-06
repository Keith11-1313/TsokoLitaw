import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), expire: vi.fn(), dispatch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/paymongo", () => ({ expirePayMongoCheckoutSession: mocks.expire }));
vi.mock("@/lib/server-notifications", () => ({ dispatchOrderNotifications: mocks.dispatch }));
import { cancelAdminOrder } from "./server-cancellation";
const input = {
  adminId: "admin",
  orderId: "order",
  expectedStatus: "PENDING_PAYMENT" as const,
  reason: "Customer requested cancellation",
};
beforeEach(() => {
  vi.resetAllMocks();
});
describe("Admin cancellation coordination", () => {
  it("expires the exact provider checkout before finalizing", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ checkout_id: "cs_exact", already_cancelled: false }] })
      .mockResolvedValueOnce({ data: true });
    await cancelAdminOrder(input);
    expect(mocks.expire).toHaveBeenCalledWith("cs_exact");
    expect(mocks.expire.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.rpc.mock.invocationCallOrder[1],
    );
    expect(mocks.rpc).toHaveBeenLastCalledWith("cancel_admin_unpaid_order", {
      target_admin_id: "admin",
      target_order_id: "order",
      expected_status: "PENDING_PAYMENT",
      reason_value: input.reason,
      expired_checkout_id: "cs_exact",
    });
    expect(mocks.dispatch).toHaveBeenCalledWith("order");
  });
  it("does not finalize if provider expiry fails", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ checkout_id: "cs_exact", already_cancelled: false }],
    });
    mocks.expire.mockRejectedValueOnce(new Error("Provider unavailable"));
    await expect(cancelAdminOrder(input)).rejects.toThrow("Provider unavailable");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("does not claim success when a payment/state race prevents commit", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ checkout_id: null, already_cancelled: false }] })
      .mockResolvedValueOnce({ error: { message: "Payment changed" } });
    await expect(cancelAdminOrder(input)).rejects.toThrow("Cancellation was not saved");
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("rejects failed preparation before contacting the provider", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { message: "Denied" } });
    await expect(cancelAdminOrder(input)).rejects.toThrow("no longer eligible");
    expect(mocks.expire).not.toHaveBeenCalled();
  });
  it("treats an already committed cancellation as an idempotent retry", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ checkout_id: null, already_cancelled: true }] });
    await cancelAdminOrder(input);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
