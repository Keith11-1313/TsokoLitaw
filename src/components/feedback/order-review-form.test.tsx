// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderReviewForm } from "./order-review-form";
import { OrderReviewModal } from "./order-review-modal";

vi.mock("@/app/orders/[orderId]/review/actions", () => ({
  submitReviewAction: vi.fn(),
}));

afterEach(cleanup);

const props = {
  orderId: "d5000000-0000-4000-8000-000000000001",
  orderNumber: "TL220926001",
  itemSummary: [
    {
      name: "4-piece box",
      quantity: 2,
      coatings: ["Sea salt cream × 4"],
    },
  ],
  existingReview: null,
};

describe("OrderReviewForm", () => {
  it("allows a rating-only review and presents structured order details", () => {
    render(<OrderReviewForm {...props} />);

    expect(screen.getByText("4-piece box")).toBeTruthy();
    expect(screen.getByText("2 boxes")).toBeTruthy();
    expect(screen.getByText("Sea salt cream × 4")).toBeTruthy();
    expect(screen.queryByText("Select one to five stars")).toBeNull();
    expect(screen.getByText("What stood out?")).toBeTruthy();
    expect(screen.getByLabelText("Tell us about your experience")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Submit review" }).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "5 star rating" }));

    expect(screen.getByText("Excellent")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Submit review" }).disabled).toBe(
      false,
    );
    expect(screen.getByLabelText("Rich cocoa flavor")).toBeTruthy();
    expect(screen.getByLabelText("Add a review image (optional)")).toBeTruthy();
  });

  it("shows the reviewed state without asking for another submission", () => {
    render(
      <OrderReviewForm
        {...props}
        existingReview={{
          id: "e5000000-0000-4000-8000-000000000001",
          rating: 4,
          comment: "Fresh and neatly packed.",
          highlights: ["Fresh at pickup"],
          hasImage: false,
          createdAt: "2026-09-22T08:00:00Z",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Review submitted" })).toBeTruthy();
    expect(screen.getByText("Your review is very much appreciated.")).toBeTruthy();
    expect(screen.getByText("Fresh and neatly packed.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit review" })).toBeNull();
  });

  it("labels an existing review clearly before opening the dialog", () => {
    render(
      <OrderReviewModal
        {...props}
        existingReview={{
          id: "e5000000-0000-4000-8000-000000000001",
          rating: 4,
          comment: "",
          highlights: [],
          hasImage: false,
          createdAt: "2026-09-22T08:00:00Z",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Review submitted" })).toBeTruthy();
    expect(screen.getByText(/You already reviewed this order/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review this order" })).toBeNull();
    expect(screen.getByRole("button", { name: "View my review" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View my review" }));
    expect(screen.getByRole("heading", { name: "My review TL220926001" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit review" })).toBeNull();
  });
});
