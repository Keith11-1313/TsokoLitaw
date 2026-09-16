// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReorderButton } from "@/components/orders/reorder-button";

const mocks = vi.hoisted(() => ({ addItem: vi.fn(), push: vi.fn() }));

vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => ({ addItem: mocks.addItem }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

afterEach(() => {
  cleanup();
  mocks.addItem.mockReset();
  mocks.push.mockReset();
});

describe("ReorderButton", () => {
  it("adds every available snapshot to the cart before opening it", async () => {
    const items = [
      {
        variantId: "variant-4",
        variantLabel: "TsokoMini (4 pcs)",
        pieceCount: 4,
        boxPrice: 60,
        coatingCounts: { cocoa: 4 },
        coatingNames: { cocoa: "Cocoa" },
        coatingPrices: { cocoa: 0 },
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
    render(<ReorderButton items={items} />);

    await user.click(screen.getByRole("button", { name: "Order again" }));

    expect(mocks.addItem).toHaveBeenCalledWith(items[0]);
    expect(mocks.push).toHaveBeenCalledWith("/cart");
  });
});
