// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ManualPaymentStatusPanel } from "@/components/orders/manual-payment-status-panel";

afterEach(cleanup);

describe("ManualPaymentStatusPanel", () => {
  it("offers a fresh checkout and one support path after expiry", () => {
    render(
      <ManualPaymentStatusPanel
        state="expired"
        orderId="7f52ac67-0ff6-4ff4-a27f-ab56f086f1ce"
        orderNumber="TL-0002"
      />,
    );

    expect(screen.getByRole("heading", { name: "Payment time ended" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Return to checkout" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Contact TsokoLitaw" })).toHaveLength(1);
  });

  it("retains the order while a receipt is under review", () => {
    render(
      <ManualPaymentStatusPanel
        state="under_review"
        orderId="7f52ac67-0ff6-4ff4-a27f-ab56f086f1ce"
        orderNumber="TL-0002"
      >
        <button type="button">Check payment status</button>
      </ManualPaymentStatusPanel>,
    );

    expect(screen.getByText(/order is still reserved/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Return to checkout" })).toBeNull();
    expect(screen.getByRole("button", { name: "Check payment status" })).toBeTruthy();
  });
});
