// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManualPaymentReview } from "./manual-payment-review";

const loadManualPaymentAction = vi.fn();

vi.mock("@/app/admin/orders/actions", () => ({
  loadManualPaymentAction: (...args: unknown[]) => loadManualPaymentAction(...args),
  reviewManualPaymentAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ManualPaymentReview", () => {
  it("shows an approved reference conflict and prevents approval", async () => {
    loadManualPaymentAction.mockResolvedValue({
      manual_qr_payload: "test",
      status: "UNDER_REVIEW",
      recipientName: "JE***D E.",
      accepting: false,
      expiresAt: null,
      approvedReferenceConflict: {
        orderId: "b5000000-0000-4000-8000-000000000001",
        orderNumber: "TL-0014",
      },
      submissions: [
        {
          id: "b6000000-0000-4000-8000-000000000002",
          reported_reference: "2041737988645",
          reported_amount: 85.5,
          reported_paid_at: "2026-09-14T00:03:00.000Z",
          reported_recipient: "Jerald Esmeria",
          status: "UNDER_REVIEW",
          submitted_at: "2026-09-14T00:03:45.000Z",
          rejection_reason: null,
        },
      ],
    });

    render(
      <ManualPaymentReview
        orderId="b5000000-0000-4000-8000-000000000002"
        orderNumber="TL-0018"
        paymentStatus="UNDER_REVIEW"
        total={85.5}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Review payment for TL-0018" }));

    expect(await screen.findByRole("dialog")).toBeTruthy();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "It was approved for order TL-0014",
    );
    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "Approve payment" }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });
  });

  it("closes the payment review when there are no unsaved decisions", async () => {
    loadManualPaymentAction.mockResolvedValue({
      manual_qr_payload: "test",
      status: "PENDING",
      recipientName: "JE***D E.",
      accepting: true,
      expiresAt: "2026-09-14T01:00:00.000Z",
      approvedReferenceConflict: null,
      submissions: [],
    });

    render(
      <ManualPaymentReview
        orderId="b5000000-0000-4000-8000-000000000003"
        orderNumber="TL-0019"
        paymentStatus="PENDING"
        total={60}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View payment for TL-0019" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(await screen.findByText("No receipt has been submitted for this order.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close payment review" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
  });

  it("warns before discarding an unfinished payment decision", async () => {
    loadManualPaymentAction.mockResolvedValue({
      manual_qr_payload: "test",
      status: "UNDER_REVIEW",
      recipientName: "JE***D E.",
      accepting: false,
      expiresAt: null,
      approvedReferenceConflict: null,
      submissions: [
        {
          id: "b6000000-0000-4000-8000-000000000004",
          reported_reference: "2041737988650",
          reported_amount: 60,
          reported_paid_at: "2026-09-14T00:03:00.000Z",
          reported_recipient: "Jerald Esmeria",
          status: "UNDER_REVIEW",
          submitted_at: "2026-09-14T00:03:45.000Z",
          rejection_reason: null,
        },
      ],
    });

    render(
      <ManualPaymentReview
        orderId="b5000000-0000-4000-8000-000000000004"
        orderNumber="TL-0020"
        paymentStatus="UNDER_REVIEW"
        total={60}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Review payment for TL-0020" }));
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Close payment review" }));

    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
