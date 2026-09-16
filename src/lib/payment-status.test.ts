import { describe, expect, it } from "vitest";
import { getOrderStatusLabelOverride, getPaymentStatusLabel } from "@/lib/payment-status";

describe("getPaymentStatusLabel", () => {
  it("distinguishes a manual receipt from a provider payment", () => {
    expect(getPaymentStatusLabel("PENDING", "manual_gcash")).toBe("Awaiting receipt");
    expect(getPaymentStatusLabel("PENDING", "paymongo")).toBe("Pending");
    expect(getPaymentStatusLabel("PENDING", "paymongo", false)).toBe("Time ended");
  });

  it("uses clear labels for review and terminal payment states", () => {
    expect(getPaymentStatusLabel("UNDER_REVIEW", "manual_gcash")).toBe("Under review");
    expect(getPaymentStatusLabel("PAID", "manual_gcash")).toBe("Paid");
    expect(getPaymentStatusLabel("FAILED", "manual_gcash")).toBe("Not paid");
  });

  it("prioritizes review and ended-window order labels", () => {
    expect(
      getOrderStatusLabelOverride({
        status: "PENDING_PAYMENT",
        paymentStatus: "UNDER_REVIEW",
        paymentWindowOpen: false,
      }),
    ).toBe("Payment under review");
    expect(
      getOrderStatusLabelOverride({
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        paymentWindowOpen: false,
      }),
    ).toBe("Payment time ended");
  });
});
