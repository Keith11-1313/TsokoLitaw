// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StaffDashboard } from "./staff-dashboard";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ id: "staff" }) }));
vi.mock("@/lib/server-orders", () => ({ getAdminOrders: async () => [] }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/components/admin/admin-page-layout", () => ({
  AdminPageLayout: ({ children, actions }: { children: ReactNode; actions: ReactNode }) => (
    <main>
      {actions}
      {children}
    </main>
  ),
}));
afterEach(cleanup);
it("renders readable pickup cards and stock figures without the removed banners", async () => {
  mocks.rpc.mockResolvedValue({
    data: [
      {
        pickup_date: "2026-10-21",
        availability_mode: "READY_STOCK",
        prepared: 100,
        reserved: 5,
        sold: 1,
        windows: [{ start: "09:00:00", end: "11:00:00", locations: "UCC Congress, 3rd Floor" }],
      },
    ],
    error: null,
  });
  render(await StaffDashboard());
  expect(screen.getByText("Wed, Oct 21, 2026")).toBeTruthy();
  expect(screen.getByText("9:00 AM – 11:00 AM")).toBeTruthy();
  expect(screen.getByText("94")).toBeTruthy();
  expect(screen.getByText("UCC Congress, 3rd Floor")).toBeTruthy();
  expect(screen.queryByText(/Operational counts/)).toBeNull();
  expect(screen.queryByRole("link", { name: "View orders" })).toBeNull();
  expect(screen.queryByText("Next 14 published dates")).toBeNull();
  expect(screen.getByRole("heading", { name: "Recent orders" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Awaiting preparation/ }).getAttribute("href")).toBe(
    "/admin/orders?status=CONFIRMED",
  );
  expect(screen.getByRole("link", { name: /Manual GCash reviews/ }).getAttribute("href")).toBe(
    "/admin/orders?payment=UNDER_REVIEW",
  );
  expect(screen.getByRole("link", { name: /Unpaid counter orders/ }).getAttribute("href")).toBe(
    "/admin/orders?payment=UNPAID_COUNTER",
  );
});
it("has an explicit empty state", async () => {
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  render(await StaffDashboard());
  expect(screen.getByText("No upcoming pickups")).toBeTruthy();
});
