import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/server-rate-limit", () => ({ enforceMutationRateLimit: mocks.rate }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { assignAccountRole } from "./actions";
const input = {
  userId: "1",
  expectedRole: "customer" as const,
  nextRole: "staff" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "2" });
  mocks.rpc.mockResolvedValue({ error: null });
});
it("authenticates before role assignment and forwards the verified actor", async () => {
  expect((await assignAccountRole(input)).status).toBe("success");
  expect(mocks.rpc).toHaveBeenCalledWith("assign_account_role", {
    target_admin_id: "2",
    target_user_id: input.userId,
    expected_role: "customer",
    next_role: "staff",
  });
});
it("denies direct Staff/customer requests before any privileged read or write", async () => {
  mocks.auth.mockRejectedValue(new Error("not-found"));
  await expect(assignAccountRole(input)).rejects.toThrow("not-found");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("blocks self-role changes", async () => {
  expect((await assignAccountRole({ ...input, userId: "2" })).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("surfaces rejected SQL changes without claiming success", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "Role changed" } });
  expect((await assignAccountRole(input)).status).toBe("error");
});
