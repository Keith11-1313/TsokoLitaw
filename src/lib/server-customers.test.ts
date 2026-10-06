import { beforeEach, expect, it, vi } from "vitest";
import { getAdminCustomerSummaries } from "./server-customers";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUserById: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    rpc: mocks.rpc,
    auth: { admin: { getUserById: mocks.getUserById } },
  }),
}));
vi.mock("@/lib/server-observability", () => ({
  measureServerOperation: (_: string, operation: () => unknown) => operation(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "count_admin_customers" ? 1 : [{ user_id: "customer" }],
    error: null,
  }));
});
it("returns only the supported Google avatar from page-local Auth metadata", async () => {
  mocks.getUserById.mockResolvedValue({
    data: {
      user: {
        user_metadata: {
          avatar_url: "https://lh3.googleusercontent.com/photo",
          private: "not serialized",
        },
      },
    },
    error: null,
  });
  const result = await getAdminCustomerSummaries("admin");
  expect(result.customers[0].avatarUrl).toBe("https://lh3.googleusercontent.com/photo");
  expect(JSON.stringify(result)).not.toContain("not serialized");
  expect(mocks.getUserById).toHaveBeenCalledExactlyOnceWith("customer");
});
it("does not fetch Auth metadata when the authorized directory query fails", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: new Error("Denied") });
  await expect(getAdminCustomerSummaries("not-admin")).rejects.toThrow("could not be loaded");
  expect(mocks.getUserById).not.toHaveBeenCalled();
});
it("rejects untrusted image hosts and tolerates Auth lookup failures", async () => {
  for (const value of ["https://evil.example/photo", "http://lh3.googleusercontent.com/photo"]) {
    mocks.getUserById.mockResolvedValue({
      data: { user: { user_metadata: { picture: value } } },
      error: null,
    });
    expect((await getAdminCustomerSummaries("admin")).customers[0].avatarUrl).toBeNull();
  }
  mocks.getUserById.mockRejectedValue(new Error("Unavailable"));
  expect((await getAdminCustomerSummaries("admin")).customers[0].avatarUrl).toBeNull();
});
