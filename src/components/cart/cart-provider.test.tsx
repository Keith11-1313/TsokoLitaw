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
      <p data-testid="pending">
        {Object.entries(cart.pendingOrderIdByItemId)
          .map(([itemId, orderId]) => `${itemId}=${orderId}`)
          .join(",")}
      </p>
      <button onClick={() => cart.removePaidCheckoutItems("order-a")}>Clear paid order A</button>
      <button onClick={() => cart.releasePendingCheckoutItems("order-a")}>Release order A</button>
      <button onClick={() => cart.setAllItemsSelected(true)}>Select all</button>
      <button onClick={() => cart.updateQuantity("a", 3)}>Update A</button>
      <button onClick={() => cart.removeItem("a")}>Remove A</button>
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
  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("a,b"));
  fireEvent.click(screen.getByText("Clear paid order A"));
  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("b"));
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
  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("a,b"));
  fireEvent.click(screen.getByText("Clear paid order A"));
  expect(screen.getByTestId("items").textContent).toBe("a,b");
});

it("locks pending checkout items until that order is released", async () => {
  localStorage.setItem("tsokolitaw-pending-checkout-items-v1:order-a", '["a"]');
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );

  await waitFor(() => expect(screen.getByTestId("items").textContent).toBe("a,b"));
  expect(screen.getByTestId("selected").textContent).toBe("b");
  expect(screen.getByTestId("pending").textContent).toBe("a=order-a");

  fireEvent.click(screen.getByText("Update A"));
  fireEvent.click(screen.getByText("Remove A"));
  fireEvent.click(screen.getByText("Select all"));
  expect(screen.getByTestId("items").textContent).toBe("a,b");
  expect(screen.getByTestId("selected").textContent).toBe("b");

  fireEvent.click(screen.getByText("Release order A"));
  fireEvent.click(screen.getByText("Select all"));
  await waitFor(() => expect(screen.getByTestId("selected").textContent).toBe("a,b"));
  expect(localStorage.getItem("tsokolitaw-pending-checkout-items-v1:order-a")).toBeNull();
});
