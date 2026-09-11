// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { CartProvider, useCart } from "./cart-provider";

function Probe() {
  const cart = useCart();
  return (
    <>
      <p>{cart.isReady ? cart.items.map((item) => item.id).join(",") : "loading"}</p>
      <button onClick={() => cart.removePaidCheckoutItems("order-a")}>Clear paid order A</button>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "tsokolitaw-cart-v2",
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
it("clears only the selection associated with the paid order", async () => {
  localStorage.setItem("tsokolitaw-pending-checkout-items-v1:order-a", '["a"]');
  localStorage.setItem("tsokolitaw-pending-checkout-items-v1:order-b", '["b"]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await screen.findByText("a,b");
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText("b");
  expect(localStorage.getItem("tsokolitaw-pending-checkout-items-v1:order-b")).toBe('["b"]');
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("tsokolitaw-cart-v2")!)).toHaveLength(1),
  );
});
it("does not trust an unscoped legacy checkout selection", async () => {
  localStorage.setItem("tsokolitaw-pending-checkout-items-v1", '["b"]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await screen.findByText("a,b");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("a,b")).toBeTruthy();
});
