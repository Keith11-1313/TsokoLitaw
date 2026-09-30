// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartPageContent } from "./cart-page-content";

const cartState = vi.hoisted(() => ({ isReady: false }));

vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => ({
    isReady: cartState.isReady,
    items: [],
    selectedItemIds: [],
    selectedSubtotal: 0,
  }),
}));

afterEach(() => {
  cleanup();
  cartState.isReady = false;
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
});
