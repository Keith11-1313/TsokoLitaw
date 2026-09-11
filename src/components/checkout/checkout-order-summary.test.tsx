// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CheckoutOrderSummary } from "./checkout-order-summary";
import type { CartLineItem } from "@/types/commerce";

afterEach(cleanup);

const item: CartLineItem = {
  id: "selected-box",
  variantId: "mini",
  variantLabel: "TsokoMini (4 pcs)",
  pieceCount: 4,
  boxPrice: 40,
  coatingCounts: { milk: 2, cocoa: 2, plain: 0 },
  coatingNames: { milk: "Milk", cocoa: "Cocoa", plain: "Plain" },
  coatingPrices: { milk: 5, cocoa: 5, plain: 0 },
  extraCoatingCharge: 20,
  addonId: "cream",
  addonName: "Sea salt cream",
  addonQuantity: 1,
  addonPrice: 18,
  quantity: 2,
};

describe("CheckoutOrderSummary", () => {
  it("preserves per-box contents, add-ons, quantities and expandable receipt detail", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CheckoutOrderSummary selectedItems={[item]} rewardDiscount={0} checkoutTotal={156} />,
    );

    expect(screen.getByRole("heading", { name: "Order summary" })).toBeTruthy();
    expect(screen.getByText("TsokoMini (4 pcs)")).toBeTruthy();
    expect(screen.getByText("Milk × 2 · Cocoa × 2")).toBeTruthy();
    expect(screen.queryByText(/Plain × 0/)).toBeNull();
    expect(screen.getByText("Sea salt cream × 1")).toBeTruthy();
    expect(screen.getByText("In each box")).toBeTruthy();
    expect(container.textContent).toContain("2 boxes");
    expect(container.textContent).toContain("₱78.00");
    expect(container.querySelector("strong")?.textContent).toBe("₱156.00");
    expect(screen.queryByText("Loyalty reward")).toBeNull();

    const details = container.querySelector("details");
    expect(details?.open).toBe(false);
    await user.click(screen.getByText("View price per box"));
    expect(details?.open).toBe(true);
  });

  it("shows the supplied reward discount without recalculating authoritative pricing", () => {
    const { container } = render(
      <CheckoutOrderSummary selectedItems={[item]} rewardDiscount={40} checkoutTotal={116} />,
    );
    expect(screen.getByText("Loyalty reward")).toBeTruthy();
    expect(screen.getByText("−₱40.00")).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe("₱116.00");
  });

  it("keeps single-box wording and omits an absent add-on", () => {
    render(
      <CheckoutOrderSummary
        selectedItems={[{ ...item, quantity: 1, addonQuantity: 0 }]}
        rewardDiscount={0}
        checkoutTotal={60}
      />,
    );
    expect(screen.getByText("In this box")).toBeTruthy();
    expect(screen.queryByText("Extra per box")).toBeNull();
    expect(screen.queryByText("Sea salt cream × 1")).toBeNull();
  });
});
