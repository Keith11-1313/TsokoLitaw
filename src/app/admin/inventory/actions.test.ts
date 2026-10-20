import { beforeEach, expect, it, vi } from "vitest";
import { saveInventoryAction, consumeInventoryAction } from "./actions";
const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  save: vi.fn(),
  consume: vi.fn(),
  rate: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/server-inventory", () => ({
  saveDailyInventory: mocks.save,
  recordInventoryConsumption: mocks.consume,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/server-rate-limit", () => ({
  enforceMutationRateLimit: mocks.rate,
  MutationRateLimitError: class extends Error {},
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireStaff.mockResolvedValue({ id: "verified-staff" });
});
it("denies an Admin before any inventory mutation", async () => {
  mocks.requireStaff.mockRejectedValue(new Error("Denied"));
  await expect(
    saveInventoryAction({ status: "idle", message: "" }, new FormData()),
  ).rejects.toThrow("Denied");
  await expect(
    consumeInventoryAction({ status: "idle", message: "" }, new FormData()),
  ).rejects.toThrow("Denied");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.consume).not.toHaveBeenCalled();
});
it("uses the verified Staff identity, not a submitted actor", async () => {
  const form = new FormData();
  form.set("productId", "10000000-0000-4000-8000-000000000001");
  form.set("pickupDate", "2099-11-01");
  form.set("stockTotal", "10");
  form.set("adminId", "forged");
  expect((await saveInventoryAction({ status: "idle", message: "" }, form)).status).toBe("success");
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ adminId: "verified-staff", stockTotal: 10 }),
  );
});
