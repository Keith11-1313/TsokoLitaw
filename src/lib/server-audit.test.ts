import { beforeEach, expect, it, vi } from "vitest";
import { getAdminAuditLog } from "./server-audit";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  range: vi.fn(),
  or: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({ id: "admin" });
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    gte: mocks.gte,
    lt: mocks.lt,
    range: mocks.range,
    eq: vi.fn().mockReturnThis(),
    or: mocks.or,
  };
  mocks.gte.mockReturnValue(query);
  mocks.lt.mockReturnValue(query);
  mocks.or.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.range.mockResolvedValue({
    data: [
      {
        id: "log",
        admin_id: "admin",
        action: "account.role_changed",
        entity_type: "profile",
        entity_id: null,
        created_at: "2026-10-21T00:00:00Z",
        metadata: { previous_role: "customer", next_role: "staff", secret: "private" },
        profiles: { full_name: "Admin", email: "admin@example.test" },
      },
    ],
    count: 1,
    error: null,
  });
});
it("authorizes before constructing a database client", async () => {
  mocks.guard.mockRejectedValue(new Error("Denied"));
  await expect(getAdminAuditLog({})).rejects.toThrow("Denied");
  expect(mocks.client).not.toHaveBeenCalled();
});
it("returns safe DTOs and applies inclusive Philippine date boundaries", async () => {
  const result = await getAdminAuditLog({
    from: "2026-10-01",
    to: "2026-10-21",
    page: 2,
    size: 50,
  });
  expect(mocks.gte).toHaveBeenCalledWith("created_at", "2026-10-01T00:00:00+08:00");
  expect(mocks.lt).toHaveBeenCalledWith("created_at", "2026-10-22T00:00:00+08:00");
  expect(mocks.range).toHaveBeenCalledWith(50, 99);
  expect(result.entries[0].change).toBe("Role: customer → staff");
  expect(JSON.stringify(result)).not.toContain("private");
  expect(result.entries[0]).not.toHaveProperty("metadata");
});
it("does not silently present a query failure as an empty log", async () => {
  mocks.range.mockResolvedValue({ error: new Error("database error"), data: null });
  await expect(getAdminAuditLog({})).rejects.toThrow("Audit log could not be loaded");
});
