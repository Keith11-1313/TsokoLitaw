import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { PaymentMethod, PaymentStatus } from "@/lib/payment-status";
import type { OrderStatus } from "@/components/ui/status-badge";

export type DashboardRangePreset = "7d" | "30d" | "this_month" | "last_month" | "custom";

export interface DashboardMetricSet {
  paidSales: number;
  paidOrders: number;
  averageOrderValue: number;
  purchasingCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  boxesSold: number;
  piecesSold: number;
  extraSales: number;
}

export interface AdminDashboardSummary {
  generatedAt: string;
  current: DashboardMetricSet;
  previous: DashboardMetricSet;
  dailySales: Array<{ date: string; paidSales: number; paidOrders: number }>;
  orderOutcomes: Array<{ status: string; count: number }>;
  boxMix: Array<{ label: string; boxes: number; pieces: number }>;
  paymentMix: Array<{ provider: string; paidOrders: number; paidSales: number }>;
  currentDecisionMetrics: DashboardDecisionMetrics;
  previousDecisionMetrics: DashboardDecisionMetrics;
  coatingMix: Array<{ label: string; pieces: number }>;
  extraMix: Array<{ label: string; quantity: number; sales: number }>;
  reviews: { count: number; averageRating: number; visible: number; featured: number };
  reviewOperations: { visible: number; featured: number; unpublished: number };
  funnel: { created: number; paid: number; completed: number; lost: number };
  inventoryByDate: Array<{
    date: string;
    mode: "MADE_TO_ORDER" | "READY_STOCK" | "HYBRID";
    prepared: number;
    committed: number;
    available: number;
  }>;
  catalogCounts: { coatings: number; variants: number; addons: number };
  pickupCounts: { dates: number; windows: number };
  journalCounts: { published: number; drafts: number };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    createdAt: string;
    pickupDate: string;
    itemSummary: string;
  }>;
  operations: {
    activeFulfillment: number;
    receiptsAwaitingReview: number;
    oldestReceiptSubmittedAt: string | null;
    committedPieces: number;
    dueToday: number;
    dueTomorrow: number;
    overdue: number;
    readyForPickup: number;
    counterAwaitingPayment: number;
  };
}

export interface DashboardDecisionMetrics {
  completionRate: number;
  completedOrders: number;
  eligibleOrders: number;
  lostOrderRate: number;
  lostOrders: number;
  createdOrders: number;
  averageFulfillmentHours: number;
  durationSampleSize: number;
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

function daysInMonth(key: string, offset = 0) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month + offset, 0)).getUTCDate();
}

function manilaTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

function previousMonthMatchingEnd(today: string, currentEnd: Date) {
  const [year, month, day] = today.split("-").map(Number);
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const previousYear = previousMonthDate.getUTCFullYear();
  const previousMonth = previousMonthDate.getUTCMonth() + 1;
  const matchingDay = Math.min(day, daysInMonth(today, -1));
  const time = manilaTime(currentEnd);
  return `${dateKey(previousYear, previousMonth, matchingDay)}T${time}${MANILA_OFFSET}`;
}

function boundary(key: string) {
  return `${key}T00:00:00${MANILA_OFFSET}`;
}

export function resolveDashboardDateRange(
  value?: string,
  customStart?: string,
  customEnd?: string,
): DashboardDateRange {
  const preset: DashboardRangePreset = ["7d", "30d", "this_month", "last_month", "custom"].includes(
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

  if (preset === "custom") {
    const validDate = /^\d{4}-\d{2}-\d{2}$/;
    if (validDate.test(customStart ?? "") && validDate.test(customEnd ?? "")) {
      const requestedStart = customStart as string;
      const requestedEndExclusive = shiftDate(customEnd as string, 1);
      const duration =
        new Date(boundary(requestedEndExclusive)).getTime() -
        new Date(boundary(requestedStart)).getTime();
      if (duration > 0 && duration <= 366 * 86400000) {
        start = requestedStart;
        end = boundary(requestedEndExclusive);
        label = `${requestedStart} to ${customEnd}`;
        comparisonLabel = "previous matching period";
      } else {
        value = "7d";
      }
    } else {
      value = "7d";
    }
  }

  if (value === "30d") {
    start = shiftDate(today, -29);
    label = "Last 30 days";
    comparisonLabel = "previous 30 days";
  } else if (value === "this_month") {
    start = monthStart(today, 0);
    label = "This month";
    comparisonLabel = "previous matching period";
  } else if (value === "last_month") {
    start = monthStart(today, -1);
    end = boundary(monthStart(today, 0));
    label = "Last month";
    comparisonLabel = "month before";
  }

  const startTimestamp = boundary(start);
  const endTimestamp = end.includes("T") ? end : boundary(end);
  const resolvedPreset: DashboardRangePreset = value === "7d" ? "7d" : preset;
  let previousEnd = startTimestamp;
  let previousStart = new Date(
    new Date(previousEnd).getTime() -
      (new Date(endTimestamp).getTime() - new Date(startTimestamp).getTime()),
  ).toISOString();
  if (resolvedPreset === "7d" || resolvedPreset === "30d") {
    const days = resolvedPreset === "7d" ? 7 : 30;
    previousStart = boundary(shiftDate(start, -days));
    previousEnd = `${shiftDate(today, -days)}T${manilaTime(new Date(endTimestamp))}${MANILA_OFFSET}`;
  } else if (resolvedPreset === "this_month") {
    previousStart = boundary(monthStart(today, -1));
    previousEnd = previousMonthMatchingEnd(today, new Date(endTimestamp));
  }
  return {
    preset: resolvedPreset,
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

function requiredRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Admin dashboard response is missing ${label}.`);
  }
  return value as Record<string, unknown>;
}

function requiredNumber(row: Record<string, unknown>, key: string, label: string) {
  if (!(key in row)) throw new Error(`Admin dashboard response is missing ${label}.${key}.`);
  const parsed = Number(row[key]);
  if (!Number.isFinite(parsed))
    throw new Error(`Admin dashboard response has invalid ${label}.${key}.`);
  return parsed;
}

function requiredString(row: Record<string, unknown>, key: string, label: string) {
  if (typeof row[key] !== "string" || !row[key]) {
    throw new Error(`Admin dashboard response has invalid ${label}.${key}.`);
  }
  return row[key] as string;
}

function parseMetricSet(value: unknown): DashboardMetricSet {
  const row = requiredRecord(value, "metric set");
  return {
    paidSales: requiredNumber(row, "paidSales", "metric set"),
    paidOrders: requiredNumber(row, "paidOrders", "metric set"),
    averageOrderValue: requiredNumber(row, "averageOrderValue", "metric set"),
    purchasingCustomers: requiredNumber(row, "purchasingCustomers", "metric set"),
    repeatCustomers: requiredNumber(row, "repeatCustomers", "metric set"),
    repeatCustomerRate: requiredNumber(row, "repeatCustomerRate", "metric set"),
    boxesSold: requiredNumber(row, "boxesSold", "metric set"),
    piecesSold: requiredNumber(row, "piecesSold", "metric set"),
    extraSales: requiredNumber(row, "extraSales", "metric set"),
  };
}

function parseDecisionMetrics(value: unknown): DashboardDecisionMetrics {
  const row = requiredRecord(value, "decision metrics");
  return {
    completionRate: toNumber(row.completionRate),
    completedOrders: toNumber(row.completedOrders),
    eligibleOrders: toNumber(row.eligibleOrders),
    lostOrderRate: toNumber(row.lostOrderRate),
    lostOrders: toNumber(row.lostOrders),
    createdOrders: toNumber(row.createdOrders),
    averageFulfillmentHours: toNumber(row.averageFulfillmentHours),
    durationSampleSize: requiredNumber(row, "durationSampleSize", "decision metrics"),
  };
}

export async function getAdminDashboardSummary(
  adminId: string,
  range: DashboardDateRange,
): Promise<AdminDashboardSummary> {
  const { data, error } = await createAdminSupabaseClient().rpc("get_admin_dashboard_decisions", {
    target_admin_id: adminId,
    period_start: range.start,
    period_end: range.end,
    previous_start: range.previousStart,
    previous_end: range.previousEnd,
  });
  if (error) throw new Error(`Unable to load Admin dashboard KPIs: ${error.message}`);
  const result = requiredRecord(data, "root payload");
  const operations = requiredRecord(result.operations, "operations");
  const funnel = requiredRecord(result.funnel, "funnel");
  const catalogCounts = requiredRecord(result.catalogCounts, "catalogCounts");
  const pickupCounts = requiredRecord(result.pickupCounts, "pickupCounts");
  const journalCounts = requiredRecord(result.journalCounts, "journalCounts");
  return {
    generatedAt: requiredString(result, "generatedAt", "root payload"),
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
    boxMix: Array.isArray(result.boxMix)
      ? result.boxMix.map((row) => {
          const point = row as Record<string, unknown>;
          return {
            label: String(point.label),
            boxes: toNumber(point.boxes),
            pieces: toNumber(point.pieces),
          };
        })
      : [],
    paymentMix: Array.isArray(result.paymentMix)
      ? result.paymentMix.map((row) => {
          const point = row as Record<string, unknown>;
          return {
            provider: String(point.provider),
            paidOrders: toNumber(point.paidOrders),
            paidSales: toNumber(point.paidSales),
          };
        })
      : [],
    currentDecisionMetrics: parseDecisionMetrics(result.currentDecisionMetrics),
    previousDecisionMetrics: parseDecisionMetrics(result.previousDecisionMetrics),
    coatingMix: Array.isArray(result.coatingMix)
      ? result.coatingMix.map((row) => {
          const point = row as Record<string, unknown>;
          return { label: String(point.label), pieces: toNumber(point.pieces) };
        })
      : [],
    extraMix: Array.isArray(result.extraMix)
      ? result.extraMix.map((row) => {
          const point = row as Record<string, unknown>;
          return {
            label: String(point.label),
            quantity: toNumber(point.quantity),
            sales: toNumber(point.sales),
          };
        })
      : [],
    reviews: (() => {
      const row =
        result.reviews && typeof result.reviews === "object"
          ? (result.reviews as Record<string, unknown>)
          : {};
      return {
        count: toNumber(row.count),
        averageRating: toNumber(row.averageRating),
        visible: toNumber(row.visible),
        featured: toNumber(row.featured),
      };
    })(),
    reviewOperations: (() => {
      const row =
        result.reviewOperations && typeof result.reviewOperations === "object"
          ? (result.reviewOperations as Record<string, unknown>)
          : {};
      return {
        visible: toNumber(row.visible),
        featured: toNumber(row.featured),
        unpublished: requiredNumber(row, "unpublished", "reviewOperations"),
      };
    })(),
    funnel: {
      created: requiredNumber(funnel, "created", "funnel"),
      paid: requiredNumber(funnel, "paid", "funnel"),
      completed: requiredNumber(funnel, "completed", "funnel"),
      lost: requiredNumber(funnel, "lost", "funnel"),
    },
    inventoryByDate: Array.isArray(result.inventoryByDate)
      ? result.inventoryByDate.map((value) => {
          const row = requiredRecord(value, "inventoryByDate item");
          const mode = requiredString(row, "mode", "inventoryByDate item");
          if (!(["MADE_TO_ORDER", "READY_STOCK", "HYBRID"] as const).includes(mode as never)) {
            throw new Error("Admin dashboard response has invalid inventory mode.");
          }
          return {
            date: requiredString(row, "date", "inventoryByDate item"),
            mode: mode as "MADE_TO_ORDER" | "READY_STOCK" | "HYBRID",
            prepared: requiredNumber(row, "prepared", "inventoryByDate item"),
            committed: requiredNumber(row, "committed", "inventoryByDate item"),
            available: requiredNumber(row, "available", "inventoryByDate item"),
          };
        })
      : (() => {
          throw new Error("Admin dashboard response is missing inventoryByDate.");
        })(),
    catalogCounts: {
      coatings: requiredNumber(catalogCounts, "coatings", "catalogCounts"),
      variants: requiredNumber(catalogCounts, "variants", "catalogCounts"),
      addons: requiredNumber(catalogCounts, "addons", "catalogCounts"),
    },
    pickupCounts: {
      dates: requiredNumber(pickupCounts, "dates", "pickupCounts"),
      windows: requiredNumber(pickupCounts, "windows", "pickupCounts"),
    },
    journalCounts: {
      published: requiredNumber(journalCounts, "published", "journalCounts"),
      drafts: requiredNumber(journalCounts, "drafts", "journalCounts"),
    },
    recentOrders: Array.isArray(result.recentOrders)
      ? result.recentOrders.map((value) => {
          const row = requiredRecord(value, "recentOrders item");
          return {
            id: requiredString(row, "id", "recentOrders item"),
            orderNumber: requiredString(row, "order_number", "recentOrders item"),
            customerName: requiredString(row, "customer_name", "recentOrders item"),
            total: requiredNumber(row, "total", "recentOrders item"),
            status: requiredString(row, "status", "recentOrders item") as OrderStatus,
            paymentStatus: requiredString(
              row,
              "payment_status",
              "recentOrders item",
            ) as PaymentStatus,
            paymentMethod: requiredString(
              row,
              "payment_method",
              "recentOrders item",
            ) as PaymentMethod,
            createdAt: requiredString(row, "created_at", "recentOrders item"),
            pickupDate: requiredString(row, "pickup_date", "recentOrders item"),
            itemSummary: typeof row.item_summary === "string" ? row.item_summary : "",
          };
        })
      : (() => {
          throw new Error("Admin dashboard response is missing recentOrders.");
        })(),
    operations: {
      activeFulfillment: requiredNumber(operations, "activeFulfillment", "operations"),
      receiptsAwaitingReview: requiredNumber(operations, "receiptsAwaitingReview", "operations"),
      oldestReceiptSubmittedAt:
        typeof operations.oldestReceiptSubmittedAt === "string"
          ? operations.oldestReceiptSubmittedAt
          : null,
      committedPieces: requiredNumber(operations, "committedPieces", "operations"),
      dueToday: requiredNumber(operations, "dueToday", "operations"),
      dueTomorrow: requiredNumber(operations, "dueTomorrow", "operations"),
      overdue: requiredNumber(operations, "overdue", "operations"),
      readyForPickup: requiredNumber(operations, "readyForPickup", "operations"),
      counterAwaitingPayment: requiredNumber(operations, "counterAwaitingPayment", "operations"),
    },
  };
}
