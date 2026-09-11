// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumePaymentButton } from "@/components/orders/resume-payment-button";

const mocks = vi.hoisted(() => ({ resume: vi.fn() }));

vi.mock("@/app/checkout/actions", () => ({
  resumePendingPaymentAction: mocks.resume,
}));

afterEach(() => {
  cleanup();
  mocks.resume.mockReset();
});

describe("ResumePaymentButton", () => {
  it("shows a recoverable provider error without creating another order", async () => {
    mocks.resume.mockResolvedValue({
      status: "error",
      message: "Secure payment could not be reopened.",
    });
    const user = userEvent.setup();
    render(<ResumePaymentButton orderId="7f52ac67-0ff6-4ff4-a27f-ab56f086f1ce" />);

    await user.click(screen.getByRole("button", { name: "Continue PayMongo payment" }));

    expect(mocks.resume).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toContain(
      "Secure payment could not be reopened.",
    );
  });
});
