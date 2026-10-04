// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderManagementTable } from "./order-management-table";
import type { AdminOrderSummary } from "@/lib/server-orders";

vi.mock("@/app/admin/orders/actions", () => ({
  recordCounterPaymentAction: vi.fn(),
  transitionOrderStatusAction: vi.fn(),
}));
vi.mock("@/components/admin/manual-payment-review", () => ({ ManualPaymentReview: () => null }));
afterEach(cleanup);

const orders: AdminOrderSummary[] = Array.from({ length: 45 }, (_, index) => ({
  id: String(index),
  orderNumber: `TEST-${index + 1}`,
  status: index === 44 ? "CANCELLED" : "COMPLETED",
  paymentStatus: "PAID",
  paymentWindowOpen: false,
  total: 100,
  orderedAt: "2026-10-01T08:00:00+08:00",
  pickupDate: "2026-10-02",
  pickupWindow: "8 AM–9 AM",
  pickupLocation: "Campus",
  itemSummary: "Test box",
  itemLines: [],
  customerName: "Customer",
  customerEmail: "customer@example.com",
  notes: null,
  boxQuantity: 1,
}));

describe("Admin order pagination", () => {
  it("places accessible filters in the page header before summary cards", () => {
    const { container } = render(
      <OrderManagementTable
        orders={[]}
        summary={<section aria-label="Order summary">Summary cards</section>}
      />,
    );
    const header = container.querySelector("header");
    expect(header?.contains(screen.getByRole("heading", { name: "Orders" }))).toBe(true);
    expect(header?.contains(screen.getByRole("searchbox", { name: "Search orders" }))).toBe(true);
    expect(header?.contains(screen.getByRole("combobox", { name: "Status filter" }))).toBe(true);
    expect(
      header?.compareDocumentPosition(screen.getByRole("region", { name: "Order summary" }))! &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it("pages the same order set in desktop and mobile views", async () => {
    const user = userEvent.setup();
    render(<OrderManagementTable orders={orders} />);
    expect(screen.getByText("Showing 1–20 of 45 matching loaded orders")).toBeTruthy();
    expect(screen.getByRole("button", { name: "First page" }).hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 21–40 of 45 matching loaded orders")).toBeTruthy();
    expect(screen.queryByText("TEST-1")).toBeNull();
    expect(screen.getAllByText("TEST-21")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByText("Showing 41–45 of 45 matching loaded orders")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("applies size automatically and resets on search and status changes", async () => {
    const user = userEvent.setup();
    render(<OrderManagementTable orders={orders} />);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(screen.getByRole("option", { name: "10" }));
    expect(screen.getByText("Showing 1–10 of 45 matching loaded orders")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Last page" }));
    await user.type(screen.getByRole("searchbox"), "TEST-45");
    expect(screen.getByText("Showing 1–1 of 1 matching loaded orders")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Order list pages" })).toBeNull();
    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("button", { name: "Last page" }));
    await user.click(screen.getByRole("combobox", { name: "Status filter" }));
    await user.click(screen.getByRole("option", { name: "Cancelled" }));
    expect(screen.getByText("Showing 1–1 of 1 matching loaded orders")).toBeTruthy();
  });

  it("clamps the page after refreshed data shrinks and handles no matches", async () => {
    const user = userEvent.setup();
    const view = render(<OrderManagementTable orders={orders} />);
    await user.click(screen.getByRole("button", { name: "Last page" }));
    view.rerender(<OrderManagementTable orders={orders.slice(0, 2)} />);
    expect(screen.getByText("Showing 1–2 of 2 matching loaded orders")).toBeTruthy();
    await user.type(screen.getByRole("searchbox"), "not-found");
    expect(screen.getByText("Showing 0–0 of 0 matching loaded orders")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Order list pages" })).toBeNull();
  });
});
