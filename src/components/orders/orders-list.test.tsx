// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { OrdersList } from "@/components/orders/orders-list";
import { OrderLineItems } from "@/components/orders/order-line-items";
import type { CustomerOrderSummary } from "@/lib/server-orders";

afterEach(cleanup);

const order: CustomerOrderSummary = {
  id: "7f52ac67-0ff6-4ff4-a27f-ab56f086f1ce",
  orderNumber: "TL-0030",
  status: "PENDING_PAYMENT",
  paymentStatus: "PENDING",
  paymentWindowOpen: true,
  total: 400.4,
  orderedAt: "2026-09-04T13:14:00+08:00",
  pickupDate: "2026-09-11",
  pickupWindow: "7:00 AM to 8:00 AM",
  pickupLocation: "UCC Congress, 3rd Floor",
  itemSummary: "This flattened fallback must not be shown to customers.",
  itemLines: [
    {
      id: "d7b3652e-36fa-442e-a62d-622626cbd66a",
      name: "TsokoMini (4 pcs)",
      quantity: 2,
      lineTotal: 120,
      basePrice: 40,
      coatingTotal: 20,
      coatings: ["Milk × 1", "Palitaw × 1", "Crushed Nuts × 1", "Sesame Seeds × 1"],
      addons: [
        {
          name: "Sea salt cream",
          quantity: 2,
          quantityPerBox: 1,
          lineTotal: 0,
          isComplimentary: true,
        },
      ],
    },
  ],
};

describe("OrdersList", () => {
  it("keeps list cards compact with a full-width order link", () => {
    render(<OrdersList orders={[order]} nextCursor={null} showingOlderPage={false} />);

    expect(screen.queryByText("TsokoMini (4 pcs)")).toBeNull();
    expect(screen.queryByText("Order items")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    const filters = screen.getByRole("navigation", { name: "Filter order history" });
    expect(filters.firstElementChild?.className).toBe("grid grid-cols-3 gap-2");
    const link = screen.getByRole("link", { name: "View order" });
    expect(link.className).toContain("w-full");
    expect(link.className).not.toContain("sm:w-auto");
    expect(screen.queryByText(order.itemSummary)).toBeNull();
  });

  it("uses pressed filter buttons and updates the visible order set", async () => {
    const user = userEvent.setup();
    render(<OrdersList orders={[order]} nextCursor={null} showingOlderPage={false} />);

    const allFilter = screen.getByRole("button", { name: /All/ });
    const completedFilter = screen.getByRole("button", { name: /Past/ });
    expect(allFilter.getAttribute("aria-pressed")).toBe("true");

    await user.click(completedFilter);

    expect(completedFilter.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("No orders in this category")).toBeTruthy();
  });

  it("groups fulfillment orders under Active and completed orders under Past", async () => {
    const user = userEvent.setup();
    const statuses: CustomerOrderSummary["status"][] = [
      "PENDING_PAYMENT",
      "PAID",
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "COMPLETED",
      "CANCELLED",
      "EXPIRED",
    ];
    render(
      <OrdersList
        orders={statuses.map((status) => ({ ...order, id: status, orderNumber: status, status }))}
        nextCursor={null}
        showingOlderPage={false}
      />,
    );
    expect(screen.getAllByRole("link", { name: "View order" })).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: /Active/ }));
    expect(screen.getAllByRole("link", { name: "View order" })).toHaveLength(4);
    expect(screen.queryByRole("heading", { name: "PENDING_PAYMENT" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "CANCELLED" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Past/ }));
    expect(screen.getAllByRole("link", { name: "View order" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "COMPLETED" })).toBeTruthy();
  });

  it("shows the order-detail price breakdown without a disclosure", () => {
    const { container } = render(<OrderLineItems items={order.itemLines} showPriceBreakdown />);
    expect(screen.getByText("Price per box")).toBeTruthy();
    expect(screen.getByText("Base box")).toBeTruthy();
    expect(screen.getByText("Coatings")).toBeTruthy();
    expect(container.querySelector("details")).toBeNull();
  });
});
