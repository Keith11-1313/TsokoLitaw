import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveDashboardDateRange } from "@/lib/server-dashboard";

describe("resolveDashboardDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T02:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("aligns the seven-day comparison to equivalent Manila calendar days", () => {
    const range = resolveDashboardDateRange("7d");
    expect(range.start).toBe("2026-09-18T00:00:00+08:00");
    expect(range.previousStart).toBe("2026-09-11T00:00:00+08:00");
    expect(range.previousEnd).toBe("2026-09-17T10:00:00+08:00");
  });

  it("compares month-to-date with the same elapsed part of the prior month", () => {
    const range = resolveDashboardDateRange("this_month");
    expect(range.start).toBe("2026-09-01T00:00:00+08:00");
    expect(range.previousStart).toBe("2026-08-01T00:00:00+08:00");
    expect(range.previousEnd).toBe("2026-08-24T10:00:00+08:00");
  });

  it("keeps custom comparisons immediately preceding and equal in length", () => {
    const range = resolveDashboardDateRange("custom", "2026-09-10", "2026-09-12");
    expect(range.previousStart).toBe("2026-09-06T16:00:00.000Z");
    expect(range.previousEnd).toBe("2026-09-10T00:00:00+08:00");
  });
});
