import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireCustomer } from "./auth";

const mocks = vi.hoisted(() => ({
  profile: {
    id: "user",
    full_name: "User",
    email: "user@example.test",
    role: "customer",
    is_active: true,
    deletion_scheduled_for: null,
  },
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: mocks.profile, error: null }),
    };
    return {
      auth: { getClaims: async () => ({ data: { claims: { sub: "user" } }, error: null }) },
      from: () => query,
    };
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.role = "customer";
  mocks.profile.is_active = true;
});
describe("role boundaries", () => {
  it("allows customers in customer routes", async () => {
    await expect(requireCustomer("/checkout")).resolves.toMatchObject({ role: "customer" });
  });
  it.each(["/checkout", "/profile", "/orders", "/orders/order/payment", "/orders/order/review"])(
    "redirects Admins away from %s",
    async (path) => {
      mocks.profile.role = "admin";
      await expect(requireCustomer(path)).rejects.toThrow("redirect:/admin");
    },
  );
  it("denies customers at Admin routes", async () => {
    await expect(requireAdmin()).rejects.toThrow("not-found");
  });
  it("allows Admin management", async () => {
    mocks.profile.role = "admin";
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });
  it("still denies inactive accounts", async () => {
    mocks.profile.is_active = false;
    await expect(requireCustomer("/checkout")).rejects.toThrow("redirect:/login");
  });
});
