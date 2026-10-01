// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentDeadline } from "@/components/orders/payment-status-refresh";

afterEach(() => {
  cleanup();
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
