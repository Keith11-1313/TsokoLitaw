// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartLineItem } from "@/types/commerce";
import { CartPageContent } from "./cart-page-content";

const cartState = vi.hoisted(() => ({
  isReady: false,
  items: [] as CartLineItem[],
  removeItem: vi.fn(),
}));

vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => ({
    isReady: cartState.isReady,
    items: cartState.items,
    selectedItemIds: cartState.items.map((item) => item.id),
    selectedSubtotal: cartState.items.length ? 40 : 0,
    removeItem: (id: string) => {
      cartState.removeItem(id);
      cartState.items = cartState.items.filter((item) => item.id !== id);
    },
  }),
}));

afterEach(() => {
  cleanup();
  cartState.isReady = false;
  cartState.items = [];
  cartState.removeItem.mockReset();
});

describe("CartPageContent", () => {
  it("waits for cart restoration before showing the empty state", () => {
    const view = render(<CartPageContent />);
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("Loading your cart");
    expect(screen.queryByText("Your cart is empty")).toBeNull();

    cartState.isReady = true;
    view.rerender(<CartPageContent />);
    expect(screen.getByText("Your cart is empty")).toBeTruthy();
  });

  it("keeps the box until removal is confirmed", async () => {
    cartState.isReady = true;
    cartState.items = [
      {
        id: "box-1",
        variantId: "mini",
        variantLabel: "TsokoMini (4 pcs)",
        pieceCount: 4,
        boxPrice: 40,
        coatingCounts: { plain: 4 },
        coatingNames: { plain: "Plain" },
        coatingPrices: { plain: 0 },
        extraCoatingCharge: 0,
        addonId: null,
        addonName: null,
        addonQuantity: 0,
        addonPrice: 0,
        complimentaryAddonName: "Sea salt cream",
        quantity: 1,
      },
    ];
    const user = userEvent.setup();
    render(<CartPageContent />);

    await user.click(screen.getByRole("button", { name: "Remove TsokoMini (4 pcs) from cart" }));
    expect(screen.getByRole("alertdialog", { name: "Remove this box?" })).toBeTruthy();
    expect(cartState.removeItem).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep box" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(cartState.removeItem).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove TsokoMini (4 pcs) from cart" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(cartState.removeItem).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove TsokoMini (4 pcs) from cart" }));
    await user.click(screen.getByRole("button", { name: "Remove box" }));
    expect(cartState.removeItem).toHaveBeenCalledWith("box-1");
    expect(screen.getByRole("heading", { name: "Your cart is empty" })).toBeTruthy();
  });
});
