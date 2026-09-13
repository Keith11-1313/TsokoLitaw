// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentDeadline, PaymentStatusRefresh } from "@/components/orders/payment-status-refresh";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

afterEach(() => {
  cleanup();
  mocks.refresh.mockReset();
  vi.useRealTimers();
});

describe("PaymentDeadline", () => {
  it("shows a live minute countdown and the exact local deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

    render(<PaymentDeadline expiresAt="2026-09-13T12:30:00.000Z" />);
    act(() => vi.advanceTimersByTime(0));

    expect(screen.getByText("Expires in 30 minutes")).toBeTruthy();
    expect(screen.getByText(/Sep 13, 2026/)).toBeTruthy();
    expect(screen.getByText(/8:30 PM/)).toBeTruthy();
  });
});

describe("PaymentStatusRefresh", () => {
  it("refreshes the order and gives visible feedback", () => {
    render(<PaymentStatusRefresh showControl />);

    fireEvent.click(screen.getByRole("button", { name: "Check payment status" }));

    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toMatch(/status checked|checking/i);
  });
});
