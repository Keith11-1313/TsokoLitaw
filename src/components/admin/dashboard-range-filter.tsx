"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import type { DashboardRangePreset } from "@/lib/server-dashboard";

const options = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom dates" },
] as const;

export function DashboardRangeFilter({
  preset,
  startDate,
  endDate,
}: {
  preset: DashboardRangePreset;
  startDate: string;
  endDate: string;
}) {
  const [selected, setSelected] = useState<DashboardRangePreset>(preset);

  return (
    <form action="/admin" className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
      <CustomSelect
        label="Reporting period"
        name="range"
        value={selected}
        onChange={(value) => setSelected(value as DashboardRangePreset)}
        options={options}
        className="w-full self-end sm:w-52"
      />
      {selected === "custom" ? (
        <>
          <label className="flex w-[calc(50%-0.25rem)] min-w-32 flex-col gap-2 text-sm font-bold text-foreground sm:w-auto">
            From
            <input
              type="date"
              name="from"
              required
              defaultValue={startDate}
              className="h-12 rounded-control border border-transparent bg-surface-control px-3 text-sm text-foreground focus-visible:border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
            />
          </label>
          <label className="flex w-[calc(50%-0.25rem)] min-w-32 flex-col gap-2 text-sm font-bold text-foreground sm:w-auto">
            To
            <input
              type="date"
              name="to"
              required
              defaultValue={endDate}
              className="h-12 rounded-control border border-transparent bg-surface-control px-3 text-sm text-foreground focus-visible:border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
            />
          </label>
        </>
      ) : null}
      <button
        type="submit"
        className="inline-flex h-12 self-end items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-surface transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Apply
      </button>
    </form>
  );
}
