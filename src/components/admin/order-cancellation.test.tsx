// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderCancellation } from "./order-cancellation";
import type { AdminOrderSummary } from "@/lib/server-orders";
const cancel = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/orders/actions", () => ({ cancelAdminOrderAction: cancel }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const order = {
  id: "order",
  orderNumber: "TL061026001",
  status: "READY_FOR_PICKUP",
  paymentStatus: "PENDING",
  paymentMethod: "pay_at_counter",
} as AdminOrderSummary;
describe("Admin cancellation confirmation", () => {
  it("keeps the cancellation trigger compact and unwrapped", () => {
    render(<OrderCancellation order={order} />);
    const button = screen.getByRole("button", { name: "Cancel order" });
    expect(button.className).toContain("whitespace-nowrap");
    expect(button.className).toContain("rounded-control");
    expect(button.className).not.toContain("rounded-full");
    expect(button.className).not.toContain("border-danger-foreground");
  });
  it("requires a reason before confirmation and passes the displayed state", async () => {
    const user = userEvent.setup();
    cancel.mockResolvedValueOnce({ status: "success", message: "Cancelled" });
    render(<OrderCancellation order={order} />);
    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    expect(
      screen.getByRole("button", { name: "Confirm cancellation" }).hasAttribute("disabled"),
    ).toBe(true);
    await user.type(
      screen.getByRole("textbox", { name: /Cancellation reason/ }),
      "Customer did not collect",
    );
    await user.click(screen.getByRole("button", { name: "Confirm cancellation" }));
    await waitFor(() =>
      expect(cancel).toHaveBeenCalledWith({
        orderId: "order",
        expectedStatus: "READY_FOR_PICKUP",
        reason: "Customer did not collect",
      }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Order cancelled");
  });
  it("keeps entered reasons after errors and asks before discarding", async () => {
    const user = userEvent.setup();
    cancel.mockResolvedValueOnce({ status: "error", message: "Order changed" });
    render(<OrderCancellation order={order} />);
    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    await user.type(screen.getByRole("textbox"), "No show");
    await user.click(screen.getByRole("button", { name: "Confirm cancellation" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Order changed");
    await user.click(screen.getByRole("button", { name: "Keep order" }));
    expect(screen.getByRole("heading", { name: "Discard unsaved changes?" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByRole("textbox")).toHaveProperty("value", "No show");
  });
  it("blocks duplicate confirmation and closing while the mutation is pending", async () => {
    const user = userEvent.setup();
    let finish!: (value: { status: "success"; message: string }) => void;
    cancel.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<OrderCancellation order={order} />);
    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    await user.type(screen.getByRole("textbox"), "No show");
    await user.click(screen.getByRole("button", { name: "Confirm cancellation" }));
    expect(screen.getByRole("button", { name: "Cancelling…" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Keep order" }).hasAttribute("disabled")).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(cancel).toHaveBeenCalledOnce();
    finish({ status: "success", message: "Cancelled" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
  it("closes a pristine dialog with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<OrderCancellation order={order} />);
    const trigger = screen.getByRole("button", { name: "Cancel order" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it.each(["PAID", "UNDER_REVIEW", "FAILED"] as const)(
    "does not offer cancellation for %s payments",
    (paymentStatus) => {
      render(<OrderCancellation order={{ ...order, paymentStatus }} />);
      expect(screen.queryByRole("button")).toBeNull();
    },
  );
});
