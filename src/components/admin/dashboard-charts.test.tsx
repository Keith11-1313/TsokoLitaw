// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FunnelChart, SalesTrendChart } from "@/components/admin/dashboard-charts";

describe("Admin dashboard charts", () => {
  it("provides exact sales data without exposing a giant image label", () => {
    render(
      <SalesTrendChart
        periodLabel="Last 7 days"
        revenue={[
          {
            rawDate: "2026-09-23",
            dateLabel: "Sep 23",
            dayLabel: "Wed",
            value: 100,
            orderCount: 2,
          },
          {
            rawDate: "2026-09-24",
            dateLabel: "Sep 24",
            dayLabel: "Thu",
            value: 75,
            orderCount: 1,
            partial: true,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Sales trend" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("View exact chart data")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Paid orders" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Sep 24 (partial)" })).toBeTruthy();
  });

  it("keeps funnel stages in one visible creation cohort", () => {
    render(<FunnelChart periodLabel="Last 7 days" created={10} paid={8} completed={6} lost={2} />);
    expect(screen.getByText("Created")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Cancelled or expired")).toBeTruthy();
  });
});
