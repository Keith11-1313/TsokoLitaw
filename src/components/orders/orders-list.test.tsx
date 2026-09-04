// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { OrdersList } from "@/components/orders/orders-list";
import type { CustomerOrderSummary } from "@/lib/server-orders";

afterEach(cleanup);

const order: CustomerOrderSummary = {
  id: "7f52ac67-0ff6-4ff4-a27f-ab56f086f1ce",
  orderNumber: "TL-0030",
  status: "PENDING_PAYMENT",
  paymentStatus: "PENDING",
  total: 400.4,
  orderedAt: "2026-09-04T13:14:00+08:00",
  pickupDate: "2026-09-11",
  pickupWindow: "7:00 AM–8:00 AM",
  pickupLocation: "UCC Congress — 3rd Floor",
  itemSummary: "This flattened fallback must not be shown to customers.",
  itemLines: [
    {
      id: "d7b3652e-36fa-442e-a62d-622626cbd66a",
      name: "TsokoMini (4 pcs)",
      quantity: 2,
      lineTotal: 120,
      coatings: ["Milk × 1", "Palitaw × 1", "Crushed Nuts × 1", "Sesame Seeds × 1"],
      addon: { name: "Sea salt cream", quantity: 10 },
    },
  ],
};

describe("OrdersList", () => {
  it("shows structured item details instead of a flattened order paragraph", () => {
    render(<OrdersList orders={[order]} nextCursor={null} showingOlderPage={false} />);

    expect(screen.getByText("TsokoMini (4 pcs)")).toBeTruthy();
    expect(screen.getByText("2 boxes")).toBeTruthy();
    expect(screen.getByText("Coatings in each box:")).toBeTruthy();
    expect(screen.getByText("Milk × 1 · Palitaw × 1 · Crushed Nuts × 1 · Sesame Seeds × 1")).toBeTruthy();
    expect(screen.getByText("Add-on per box:")).toBeTruthy();
    expect(screen.getByText("Sea salt cream × 10")).toBeTruthy();
    expect(screen.queryByText(order.itemSummary)).toBeNull();
  });

  it("uses pressed filter buttons and updates the visible order set", async () => {
    const user = userEvent.setup();
    render(<OrdersList orders={[order]} nextCursor={null} showingOlderPage={false} />);

    const allFilter = screen.getByRole("button", { name: /All/ });
    const completedFilter = screen.getByRole("button", { name: /Completed/ });
    expect(allFilter.getAttribute("aria-pressed")).toBe("true");

    await user.click(completedFilter);

    expect(completedFilter.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("No orders in this category")).toBeTruthy();
  });
});
