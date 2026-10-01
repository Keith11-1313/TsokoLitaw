import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  Boxes,
  CalendarDays,
  Gauge,
  Package,
  PackageCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import {
  DashboardMixCharts,
  FunnelChart,
  SalesTrendChart,
  type DailyRevenuePoint,
} from "@/components/admin/dashboard-charts";
import { DashboardRangeFilter } from "@/components/admin/dashboard-range-filter";
import { QuickOperations } from "@/components/admin/quick-operations";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getAdminDashboardSummary, resolveDashboardDateRange } from "@/lib/server-dashboard";
import { expireDueDirectPayments } from "@/lib/server-payment";

export const metadata: Metadata = {
  title: "Admin Dashboard | TsokoLitaw",
  description: "TsokoLitaw order and operations dashboard.",
};

function comparisonText(current: number, previous: number, label: string, rate = false) {
  if (rate) {
    const difference = current - previous;
    return `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} points vs ${label}`;
  }
  if (previous === 0) return current > 0 ? `New vs ${label}` : `No change vs ${label}`;
  const difference = ((current - previous) / previous) * 100;
  return `${difference >= 0 ? "+" : ""}${difference.toFixed(1)}% vs ${label}`;
}

function comparisonTrend(current: number, previous: number, increaseIsGood = true) {
  if (current === previous) return "neutral" as const;
  const improved = current > previous ? increaseIsGood : !increaseIsGood;
  return improved ? ("positive" as const) : ("negative" as const);
}

function groupRevenue(points: DailyRevenuePoint[]) {
  if (points.length <= 14) return points;
  if (points.length > 90) {
    const months = new Map<string, DailyRevenuePoint>();
    for (const point of points) {
      const date = new Date(`${point.rawDate}T12:00:00+08:00`);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = new Intl.DateTimeFormat("en-PH", {
        month: "short",
        year: "numeric",
        timeZone: "Asia/Manila",
      }).format(date);
      const existing = months.get(key);
      months.set(key, {
        dateLabel: label,
        dayLabel: point.dayLabel,
        rawDate: point.rawDate,
        value: (existing?.value ?? 0) + point.value,
        orderCount: (existing?.orderCount ?? 0) + point.orderCount,
        partial: existing?.partial ?? false,
      });
    }
    return [...months.values()];
  }
  const grouped: DailyRevenuePoint[] = [];
  for (let index = 0; index < points.length; index += 7) {
    const group = points.slice(index, index + 7);
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) continue;
    grouped.push({
      dateLabel:
        first.dateLabel === last.dateLabel
          ? first.dateLabel
          : `${first.dateLabel}–${last.dateLabel}`,
      dayLabel: `Week ${grouped.length + 1}`,
      rawDate: first.rawDate,
      value: group.reduce((sum, point) => sum + point.value, 0),
      orderCount: group.reduce((sum, point) => sum + point.orderCount, 0),
      partial: group.length < 7,
    });
  }
  return grouped;
}

function formatHours(value: number) {
  if (value <= 0) return "No completed orders";
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(1)} hr`;
}

function receiptWaitText(value: string | null) {
  if (!value) return "No payment receipts awaiting review";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `Oldest waiting ${minutes} min`;
  return `Oldest waiting ${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
}) {
  const admin = await requireAdmin("/admin");
  const params = await searchParams;
  const rangeValue = typeof params.range === "string" ? params.range : undefined;
  const fromValue = typeof params.from === "string" ? params.from : undefined;
  const toValue = typeof params.to === "string" ? params.to : undefined;
  const range = resolveDashboardDateRange(rangeValue, fromValue, toValue);
  // Expire due direct payments before loading the dashboard's read-only summaries.
  await expireDueDirectPayments();
  const dashboard = await getAdminDashboardSummary(admin.id, range);
  const dailyRevenuePoints: DailyRevenuePoint[] = dashboard.dailySales.map((point) => {
    const date = new Date(`${point.date}T12:00:00+08:00`);
    return {
      dateLabel: new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      }).format(date),
      dayLabel: new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "short",
      }).format(date),
      rawDate: point.date,
      value: point.paidSales,
      orderCount: point.paidOrders,
    };
  });
  const revenuePoints = groupRevenue(dailyRevenuePoints);
  const dashboardStats = [
    {
      label: "Paid sales",
      value: formatPhp(dashboard.current.paidSales),
      supportingText: comparisonText(
        dashboard.current.paidSales,
        dashboard.previous.paidSales,
        range.comparisonLabel,
      ),
      icon: Banknote,
      href: "/admin/orders",
      trend: comparisonTrend(dashboard.current.paidSales, dashboard.previous.paidSales),
    },
    {
      label: "Paid orders",
      value: String(dashboard.current.paidOrders),
      supportingText: comparisonText(
        dashboard.current.paidOrders,
        dashboard.previous.paidOrders,
        range.comparisonLabel,
      ),
      icon: ShoppingCart,
      href: "/admin/orders",
      trend: comparisonTrend(dashboard.current.paidOrders, dashboard.previous.paidOrders),
    },
    {
      label: "Average order value",
      value: formatPhp(dashboard.current.averageOrderValue),
      supportingText: comparisonText(
        dashboard.current.averageOrderValue,
        dashboard.previous.averageOrderValue,
        range.comparisonLabel,
      ),
      icon: ShoppingBag,
      href: "/admin/orders",
      trend: comparisonTrend(
        dashboard.current.averageOrderValue,
        dashboard.previous.averageOrderValue,
      ),
    },
    {
      label: "Repeat buyer share",
      value: `${dashboard.current.repeatCustomerRate.toFixed(1)}%`,
      supportingText: `${comparisonText(
        dashboard.current.repeatCustomerRate,
        dashboard.previous.repeatCustomerRate,
        range.comparisonLabel,
        true,
      )} · ${dashboard.current.repeatCustomers} of ${dashboard.current.purchasingCustomers}`,
      icon: Users,
      href: "/admin/customers",
      trend: comparisonTrend(
        dashboard.current.repeatCustomerRate,
        dashboard.previous.repeatCustomerRate,
      ),
    },
  ] as const;
  const salesDetails = [
    {
      label: "Paid-extra sales",
      value: formatPhp(dashboard.current.extraSales),
      supportingText: comparisonText(
        dashboard.current.extraSales,
        dashboard.previous.extraSales,
        range.comparisonLabel,
      ),
      icon: Boxes,
      href: "/admin/products",
      trend: comparisonTrend(dashboard.current.extraSales, dashboard.previous.extraSales),
    },
    {
      label: "Sales per customer",
      value: formatPhp(
        dashboard.current.purchasingCustomers > 0
          ? dashboard.current.paidSales / dashboard.current.purchasingCustomers
          : 0,
      ),
      supportingText: comparisonText(
        dashboard.current.purchasingCustomers > 0
          ? dashboard.current.paidSales / dashboard.current.purchasingCustomers
          : 0,
        dashboard.previous.purchasingCustomers > 0
          ? dashboard.previous.paidSales / dashboard.previous.purchasingCustomers
          : 0,
        range.comparisonLabel,
      ),
      icon: PackageCheck,
      href: "/admin/customers",
      trend: comparisonTrend(
        dashboard.current.purchasingCustomers > 0
          ? dashboard.current.paidSales / dashboard.current.purchasingCustomers
          : 0,
        dashboard.previous.purchasingCustomers > 0
          ? dashboard.previous.paidSales / dashboard.previous.purchasingCustomers
          : 0,
      ),
    },
    {
      label: "New customers",
      value: String(dashboard.current.purchasingCustomers - dashboard.current.repeatCustomers),
      supportingText: `${dashboard.current.repeatCustomers} returning · ${dashboard.current.purchasingCustomers} total`,
      icon: Users,
      href: "/admin/customers",
    },
    {
      label: "Completion rate",
      value: `${dashboard.currentDecisionMetrics.completionRate.toFixed(1)}%`,
      supportingText: `${dashboard.currentDecisionMetrics.completedOrders} of ${dashboard.currentDecisionMetrics.eligibleOrders} paid orders completed`,
      icon: Gauge,
      href: "/admin/orders",
      trend: comparisonTrend(
        dashboard.currentDecisionMetrics.completionRate,
        dashboard.previousDecisionMetrics.completionRate,
      ),
    },
    {
      label: "Cancelled or expired",
      value: `${dashboard.currentDecisionMetrics.lostOrderRate.toFixed(1)}%`,
      supportingText: `${dashboard.currentDecisionMetrics.lostOrders} of ${dashboard.currentDecisionMetrics.createdOrders} created orders`,
      icon: ShoppingCart,
      href: "/admin/orders",
      trend: comparisonTrend(
        dashboard.currentDecisionMetrics.lostOrderRate,
        dashboard.previousDecisionMetrics.lostOrderRate,
        false,
      ),
    },
  ] as const;
  const maximumBoxCount = Math.max(...dashboard.boxMix.map((item) => item.boxes), 0);
  const paymentLabels: Record<string, string> = {
    paymongo: "PayMongo",
    manual_gcash: "Manual GCash",
    pay_at_counter: "Pay at the counter",
    loyalty: "Loyalty reward",
  };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const firstName = admin.fullName.trim().split(/\s+/)[0] || "Admin";

  return (
    <AdminShell activePath="/admin">
      <AdminContent>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] leading-tight sm:text-[2.25rem]">
              Good day, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Business performance and current operational workload
            </p>
          </div>
          <DashboardRangeFilter
            preset={range.preset}
            startDate={fromValue ?? range.start.slice(0, 10)}
            endDate={toValue ?? today}
          />
        </header>

        <section
          className="mt-7 grid gap-3 min-[390px]:grid-cols-2 sm:gap-4 xl:grid-cols-4"
          aria-label="Dashboard summary"
        >
          {dashboardStats.map((stat) => (
            <AdminStatCard key={stat.label} compact {...stat} />
          ))}
        </section>

        <section
          className="mt-4 grid gap-3 min-[390px]:grid-cols-2 sm:gap-4 xl:grid-cols-5"
          aria-label="Sales details"
        >
          {salesDetails.map((stat) => (
            <AdminStatCard key={stat.label} compact {...stat} />
          ))}
        </section>

        <section
          className="mt-8 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,1fr)]"
          aria-label="Business trends"
        >
          <SalesTrendChart periodLabel={range.label} revenue={revenuePoints} />
          <FunnelChart periodLabel={range.label} {...dashboard.funnel} />
        </section>

        <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2" aria-label="Sales mix">
          <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-display text-2xl">Top box sizes</h2>
            <p className="mt-1 text-xs text-muted-foreground">Paid boxes · {range.label}</p>
            {dashboard.boxMix.length === 0 ? (
              <p className="mt-5 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
                No paid products in this period yet.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {dashboard.boxMix.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-end justify-between gap-4 text-sm">
                      <span className="min-w-0 truncate font-bold text-foreground">
                        {item.label}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {item.boxes} {item.boxes === 1 ? "box" : "boxes"} ·{" "}
                        {dashboard.current.boxesSold > 0
                          ? `${Math.round((item.boxes / dashboard.current.boxesSold) * 100)}% of boxes`
                          : "0% of boxes"}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{
                          width: `${maximumBoxCount > 0 ? (item.boxes / maximumBoxCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-display text-2xl">How customers paid</h2>
            <p className="mt-1 text-xs text-muted-foreground">Confirmed payments · {range.label}</p>
            {dashboard.paymentMix.length === 0 ? (
              <p className="mt-5 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
                No confirmed payments in this period yet.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-border">
                {dashboard.paymentMix.map((item) => (
                  <div
                    key={item.provider}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {paymentLabels[item.provider] ?? item.provider}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.paidOrders} paid {item.paidOrders === 1 ? "order" : "orders"}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-xl text-foreground">
                      {formatPhp(item.paidSales)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <div className="mt-5">
          <DashboardMixCharts
            periodLabel={range.label}
            coatings={dashboard.coatingMix.map((item) => ({
              label: item.label,
              value: item.pieces,
              detail: `${item.pieces} ${item.pieces === 1 ? "piece" : "pieces"}`,
            }))}
            extras={dashboard.extraMix.map((item) => ({
              label: item.label,
              value: item.quantity,
              detail: `${item.quantity} sold · ${formatPhp(item.sales)}`,
            }))}
          />
        </div>

        <section className="mt-8" aria-labelledby="performance-details-heading">
          <h2 id="performance-details-heading" className="font-display text-2xl">
            Performance details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminStatCard
              compact
              label="Payment-to-completion"
              value={formatHours(dashboard.currentDecisionMetrics.averageFulfillmentHours)}
              supportingText={
                dashboard.currentDecisionMetrics.durationSampleSize > 0
                  ? `${dashboard.currentDecisionMetrics.durationSampleSize} completed samples · ${comparisonText(
                      dashboard.currentDecisionMetrics.averageFulfillmentHours,
                      dashboard.previousDecisionMetrics.averageFulfillmentHours,
                      range.comparisonLabel,
                    )}`
                  : "No completed sample in this period"
              }
              icon={Timer}
              href="/admin/orders"
              trend={comparisonTrend(
                dashboard.currentDecisionMetrics.averageFulfillmentHours,
                dashboard.previousDecisionMetrics.averageFulfillmentHours,
                false,
              )}
            />
            <AdminStatCard
              compact
              label="Customer reviews"
              value={
                dashboard.reviews.count > 0
                  ? `${dashboard.reviews.averageRating.toFixed(1)} / 5`
                  : "No reviews yet"
              }
              supportingText={`${dashboard.reviews.count} submitted · ${dashboard.reviewOperations.unpublished} unpublished`}
              icon={Star}
              href="/admin/reviews"
            />
            <AdminStatCard
              compact
              label="Product volume"
              value={`${dashboard.current.boxesSold} boxes`}
              supportingText={`${dashboard.current.piecesSold} pieces sold · ${range.label.toLowerCase()}`}
              icon={Package}
              href="/admin/products"
            />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="operations-overview-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="operations-overview-heading" className="font-display text-2xl">
                Needs attention
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current workload, independent of the reporting period
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                href: "/admin/orders",
                title: "Orders",
                value: `${dashboard.operations.overdue} overdue`,
                detail: `${dashboard.operations.activeFulfillment} active fulfillment orders`,
                icon: ShoppingBag,
              },
              {
                href: "/admin/orders",
                title: "Due today",
                value: `${dashboard.operations.dueToday} orders`,
                detail: `${dashboard.operations.dueTomorrow} due tomorrow`,
                icon: CalendarDays,
              },
              {
                href: "/admin/orders?status=READY_FOR_PICKUP",
                title: "Ready for pickup",
                value: `${dashboard.operations.readyForPickup} orders`,
                detail: "Customer collection queue",
                icon: PackageCheck,
              },
              {
                href: "/admin/orders?status=PENDING_PAYMENT",
                title: "Receipt review",
                value: `${dashboard.operations.receiptsAwaitingReview} waiting`,
                detail: receiptWaitText(dashboard.operations.oldestReceiptSubmittedAt),
                icon: Banknote,
              },
              {
                href: "/admin/orders",
                title: "Counter payments",
                value: `${dashboard.operations.counterAwaitingPayment} unpaid`,
                detail: "Website orders awaiting in-person payment",
                icon: ShoppingCart,
              },
              {
                href: "/admin/reviews",
                title: "Review moderation",
                value: `${dashboard.reviewOperations.unpublished} unpublished`,
                detail: `${dashboard.reviewOperations.visible} public · ${dashboard.reviewOperations.featured} featured`,
                icon: Star,
              },
            ].map((area) => {
              const Icon = area.icon;
              return (
                <Link
                  key={area.title}
                  href={area.href}
                  className="group rounded-card border border-border bg-surface p-5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-brand">
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-muted-foreground transition-transform group-hover:translate-x-1"
                      size={17}
                    />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">
                    {area.title}
                  </p>
                  <p className="mt-1 font-display text-xl text-foreground">{area.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{area.detail}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="pickup-stock-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="pickup-stock-heading" className="font-display text-2xl">
                Upcoming pickup stock
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Prepared inventory is date-specific; made-to-order dates do not require prepared
                stock.
              </p>
            </div>
            <Link
              href="/admin/inventory"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Manage inventory <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          {dashboard.inventoryByDate.length === 0 ? (
            <p className="mt-4 rounded-card border border-border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
              No open upcoming pickup dates.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.inventoryByDate.map((item) => {
                const modeLabel =
                  item.mode === "MADE_TO_ORDER"
                    ? "Made to order"
                    : item.mode === "READY_STOCK"
                      ? "Ready stock"
                      : "Hybrid";
                const needsPreparedStock = item.mode !== "MADE_TO_ORDER";
                return (
                  <article
                    key={item.date}
                    className="rounded-card border border-border bg-surface p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-xl text-foreground">
                          {new Intl.DateTimeFormat("en-PH", {
                            timeZone: "Asia/Manila",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(`${item.date}T12:00:00+08:00`))}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">
                          {modeLabel}
                        </p>
                      </div>
                      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-foreground">
                        {needsPreparedStock ? `${item.available} remaining` : "Produce to order"}
                      </span>
                    </div>
                    {needsPreparedStock ? (
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Prepared</dt>
                          <dd className="font-bold text-foreground">{item.prepared}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Committed</dt>
                          <dd className="font-bold text-foreground">{item.committed}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Demand is fulfilled from confirmed website orders rather than a
                        prepared-stock pool.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8" aria-labelledby="configuration-heading">
          <h2 id="configuration-heading" className="font-display text-2xl">
            Configuration overview
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/products"
              className="rounded-card border border-border bg-surface p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <p className="text-xs font-bold uppercase text-muted-foreground">Catalog</p>
              <p className="mt-1 font-display text-xl text-foreground">
                {dashboard.catalogCounts.coatings} coatings
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dashboard.catalogCounts.variants} box sizes · {dashboard.catalogCounts.addons}{" "}
                extras
              </p>
            </Link>
            <Link
              href="/admin/pickup"
              className="rounded-card border border-border bg-surface p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <p className="text-xs font-bold uppercase text-muted-foreground">Pickup</p>
              <p className="mt-1 font-display text-xl text-foreground">
                {dashboard.pickupCounts.dates} open dates
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dashboard.pickupCounts.windows} published windows
              </p>
            </Link>
            <Link
              href="/admin/journal"
              className="rounded-card border border-border bg-surface p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <p className="text-xs font-bold uppercase text-muted-foreground">Journal</p>
              <p className="mt-1 font-display text-xl text-foreground">
                {dashboard.journalCounts.published} published
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dashboard.journalCounts.drafts} drafts
              </p>
            </Link>
          </div>
        </section>

        <div className="mt-8">
          <RecentOrdersTable orders={dashboard.recentOrders} />
        </div>

        <div className="mt-8">
          <QuickOperations />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Updated{" "}
          {new Intl.DateTimeFormat("en-PH", {
            timeZone: "Asia/Manila",
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(dashboard.generatedAt))}{" "}
          Manila time
        </p>
      </AdminContent>
    </AdminShell>
  );
}
