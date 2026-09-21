import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type DashboardRangePreset = "7d" | "30d" | "this_month" | "last_month";

export interface DashboardMetricSet {
  paidSales: number;
  paidOrders: number;
  averageOrderValue: number;
  purchasingCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
}

export interface AdminDashboardSummary {
  current: DashboardMetricSet;
  previous: DashboardMetricSet;
  dailySales: Array<{ date: string; paidSales: number; paidOrders: number }>;
  orderOutcomes: Array<{ status: string; count: number }>;
  operations: {
    activeFulfillment: number;
    receiptsAwaitingReview: number;
    oldestReceiptSubmittedAt: string | null;
    availablePieces: number;
  };
}

export interface DashboardDateRange {
  preset: DashboardRangePreset;
  label: string;
  comparisonLabel: string;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
}

const MANILA_OFFSET = "+08:00";

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftDate(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

function monthStart(key: string, offset: number) {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1);
}

function boundary(key: string) {
  return `${key}T00:00:00${MANILA_OFFSET}`;
}

export function resolveDashboardDateRange(value?: string): DashboardDateRange {
  const preset: DashboardRangePreset = ["7d", "30d", "this_month", "last_month"].includes(
    value ?? "",
  )
    ? (value as DashboardRangePreset)
    : "7d";
  const todayParts = localDateParts(new Date());
  const today = dateKey(todayParts.year, todayParts.month, todayParts.day);
  let start = shiftDate(today, -6);
  let end = new Date().toISOString();
  let label = "Last 7 days";
  let comparisonLabel = "previous 7 days";

  if (preset === "30d") {
    start = shiftDate(today, -29);
    label = "Last 30 days";
    comparisonLabel = "previous 30 days";
  } else if (preset === "this_month") {
    start = monthStart(today, 0);
    label = "This month";
    comparisonLabel = "previous matching period";
  } else if (preset === "last_month") {
    start = monthStart(today, -1);
    end = boundary(monthStart(today, 0));
    label = "Last month";
    comparisonLabel = "month before";
  }

  const startTimestamp = boundary(start);
  const endTimestamp = end.includes("T") ? end : boundary(end);
  const previousEnd = startTimestamp;
  const previousStart = new Date(
    new Date(previousEnd).getTime() -
      (new Date(endTimestamp).getTime() - new Date(startTimestamp).getTime()),
  ).toISOString();
  return {
    preset,
    label,
    comparisonLabel,
    start: startTimestamp,
    end: endTimestamp,
    previousStart,
    previousEnd,
  };
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMetricSet(value: unknown): DashboardMetricSet {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    paidSales: toNumber(row.paidSales),
    paidOrders: toNumber(row.paidOrders),
    averageOrderValue: toNumber(row.averageOrderValue),
    purchasingCustomers: toNumber(row.purchasingCustomers),
    repeatCustomers: toNumber(row.repeatCustomers),
    repeatCustomerRate: toNumber(row.repeatCustomerRate),
  };
}

export async function getAdminDashboardSummary(
  adminId: string,
  range: DashboardDateRange,
): Promise<AdminDashboardSummary> {
  const { data, error } = await createAdminSupabaseClient().rpc("get_admin_dashboard_summary", {
    target_admin_id: adminId,
    period_start: range.start,
    period_end: range.end,
    previous_start: range.previousStart,
    previous_end: range.previousEnd,
  });
  if (error) throw new Error(`Unable to load Admin dashboard KPIs: ${error.message}`);
  const result = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const operations =
    result.operations && typeof result.operations === "object"
      ? (result.operations as Record<string, unknown>)
      : {};
  return {
    current: parseMetricSet(result.current),
    previous: parseMetricSet(result.previous),
    dailySales: Array.isArray(result.dailySales)
      ? result.dailySales.map((row) => {
          const point = row as Record<string, unknown>;
          return {
            date: String(point.date),
            paidSales: toNumber(point.paidSales),
            paidOrders: toNumber(point.paidOrders),
          };
        })
      : [],
    orderOutcomes: Array.isArray(result.orderOutcomes)
      ? result.orderOutcomes.map((row) => {
          const point = row as Record<string, unknown>;
          return { status: String(point.status), count: toNumber(point.count) };
        })
      : [],
    operations: {
      activeFulfillment: toNumber(operations.activeFulfillment),
      receiptsAwaitingReview: toNumber(operations.receiptsAwaitingReview),
      oldestReceiptSubmittedAt:
        typeof operations.oldestReceiptSubmittedAt === "string"
          ? operations.oldestReceiptSubmittedAt
          : null,
      availablePieces: toNumber(operations.availablePieces),
    },
  };
}
