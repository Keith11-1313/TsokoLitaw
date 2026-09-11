// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { CartProvider, useCart } from "./cart-provider";

function Probe() {
  const cart = useCart();
  return (
    <>
      <p data-testid="items">
        {cart.isReady ? cart.items.map((item) => item.id).join(",") : "loading"}
      </p>
      <p data-testid="selected">{cart.selectedItemIds.join(",")}</p>
      <button onClick={() => cart.removeCheckedOutItems()}>Complete checkout</button>
      <button onClick={() => cart.setAllItemsSelected(true)}>Select all</button>
      <button onClick={() => cart.updateQuantity("a", 3)}>Update A</button>
      <button onClick={() => cart.removeItem("a")}>Remove A</button>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "tsokolitaw-cart-v3",
    JSON.stringify(
      ["a", "b"].map((id) => ({
        id,
        pieceCount: 4,
        boxPrice: 40,
        coatingCounts: {},
        coatingNames: {},
        quantity: 1,
      })),
    ),
  );
});
afterEach(cleanup);
it("starts a clean cart when upgrading from the retired pre-release storage", async () => {
  localStorage.clear();
  localStorage.setItem("tsokolitaw-cart-v2", '[{"id":"old-order-line"}]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );

  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe(""));
  expect(localStorage.getItem("tsokolitaw-cart-v2")).toBeNull();
});

it("removes checked-out lines immediately and preserves other cart items", async () => {
  localStorage.setItem("tsokolitaw-cart-selection-v2", '["a"]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("a,b"));
  fireEvent.click(screen.getByText("Complete checkout"));
  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("b"));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("tsokolitaw-cart-v3")!)).toHaveLength(1),
  );
});
it("removes cart lines locked by the retired pending-checkout storage", async () => {
  localStorage.setItem("tsokolitaw-pending-checkout-items-v1:deleted-order", '["a"]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("b"));
  expect(localStorage.getItem("tsokolitaw-pending-checkout-items-v1:deleted-order")).toBeNull();
});

it("discards the retired unscoped marker without deleting uncertain cart lines", async () => {
  localStorage.setItem("tsokolitaw-pending-checkout-items-v1", '["a"]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );

  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("a,b"));
  expect(localStorage.getItem("tsokolitaw-pending-checkout-items-v1")).toBeNull();
});
