import { formatPhp } from "@/lib/commerce";

export interface DailyRevenuePoint {
  dateLabel: string;
  dayLabel: string;
  value: number;
  orderCount: number;
}

export interface OrderStatusPoint {
  label: string;
  value: number;
  colorClassName: string;
}

export interface MixPoint {
  label: string;
  value: number;
  detail: string;
}

const donutColors = [
  "var(--brand)",
  "var(--info-foreground)",
  "var(--success-foreground)",
  "var(--warning-foreground)",
  "var(--muted-foreground)",
] as const;

function DonutChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: readonly MixPoint[];
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const segments = points.map((point, index) => ({
    point,
    percentage: total > 0 ? (point.value / total) * 100 : 0,
    offset:
      total > 0
        ? (points.slice(0, index).reduce((sum, prior) => sum + prior.value, 0) / total) * 100
        : 0,
  }));
  return (
    <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {total === 0 ? (
        <p className="mt-5 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
          No matching paid purchases in this period.
        </p>
      ) : (
        <div className="mt-5 grid items-center gap-5 sm:grid-cols-[9rem_1fr]">
          <div
            className="relative mx-auto size-36"
            role="img"
            aria-label={`${title}. ${points.map((point) => `${point.label}: ${point.detail}`).join("; ")}`}
          >
            <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden="true">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke="var(--surface-muted)"
                strokeWidth="7"
              />
              {segments.map(({ point, percentage, offset }, index) => {
                return (
                  <circle
                    key={point.label}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="none"
                    stroke={donutColors[index % donutColors.length]}
                    strokeWidth="7"
                    strokeDasharray={`${percentage} ${100 - percentage}`}
                    strokeDashoffset={-offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-2xl text-foreground">{total}</span>
              <span className="text-[0.65rem] font-bold uppercase text-muted-foreground">
                total
              </span>
            </div>
          </div>
          <ul className="space-y-3">
            {points.map((point, index) => (
              <li key={point.label} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-bold text-foreground">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: donutColors[index % donutColors.length] }}
                  />
                  <span className="truncate">{point.label}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {point.detail}
                  <br />
                  {((point.value / total) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export function DashboardMixCharts({
  coatings,
  extras,
  periodLabel,
}: {
  coatings: readonly MixPoint[];
  extras: readonly MixPoint[];
  periodLabel: string;
}) {
  return (
    <section className="grid min-w-0 gap-5 lg:grid-cols-2" aria-label="Product mix charts">
      <DonutChart
        title="Coatings purchased"
        subtitle={`Paid-order pieces · ${periodLabel}`}
        points={coatings}
      />
      <DonutChart
        title="Extras purchased"
        subtitle={`Paid extras · ${periodLabel}`}
        points={extras}
      />
    </section>
  );
}

export function DashboardCharts({
  revenue,
  statuses,
  periodLabel,
  previousRevenue,
  comparisonLabel,
}: {
  revenue: readonly DailyRevenuePoint[];
  statuses: readonly OrderStatusPoint[];
  periodLabel: string;
  previousRevenue: number;
  comparisonLabel: string;
}) {
  const maximumRevenue = Math.max(...revenue.map((point) => point.value), 0);
  const revenueTotal = revenue.reduce((total, point) => total + point.value, 0);
  const orderTotal = statuses.reduce((total, point) => total + point.value, 0);
  const revenueComparison =
    previousRevenue === 0
      ? revenueTotal > 0
        ? "New"
        : "No change"
      : `${((revenueTotal - previousRevenue) / previousRevenue) * 100 >= 0 ? "+" : ""}${(((revenueTotal - previousRevenue) / previousRevenue) * 100).toFixed(1)}%`;

  return (
    <section
      className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,1fr)]"
      aria-label="Order charts"
    >
      <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Paid sales</h2>
            <p className="mt-1 text-xs text-muted-foreground">Payment date · {periodLabel}</p>
          </div>
          <div className="w-full text-left sm:w-auto sm:text-right">
            <p className="text-xs font-bold uppercase text-muted-foreground">Paid sales</p>
            <p className="font-display text-2xl text-foreground">{formatPhp(revenueTotal)}</p>
            <p className="text-xs text-muted-foreground">
              {revenueComparison} vs {comparisonLabel}
            </p>
          </div>
        </div>

        {maximumRevenue === 0 ? (
          <div className="mt-6 flex h-52 items-center justify-center rounded-control bg-surface-muted px-6 text-center text-sm text-muted-foreground sm:h-60">
            No paid sales in this period yet.
          </div>
        ) : (
          <div
            className="mt-6 grid h-52 min-w-0 items-end gap-1 overflow-hidden border-b border-border px-1 sm:h-60 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${revenue.length}, minmax(0, 1fr))` }}
            role="img"
            aria-label={`Paid sales for ${periodLabel} total ${formatPhp(revenueTotal)}. ${revenue.map((point) => `${point.dateLabel}: ${formatPhp(point.value)} from ${point.orderCount} paid orders`).join("; ")}`}
          >
            {revenue.map((point, index) => {
              const height = maximumRevenue > 0 ? (point.value / maximumRevenue) * 100 : 0;
              const showLabel =
                revenue.length <= 14 || index % 5 === 0 || index === revenue.length - 1;
              return (
                <div
                  key={point.dateLabel}
                  className="group relative flex h-full min-w-0 flex-col justify-end gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  tabIndex={0}
                  aria-label={`${point.dateLabel}: ${formatPhp(point.value)} from ${point.orderCount} paid orders`}
                >
                  <span className="pointer-events-none absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-control bg-foreground px-2 py-1 text-[0.65rem] text-background shadow-lg group-hover:block group-focus:block">
                    {formatPhp(point.value)} · {point.orderCount}{" "}
                    {point.orderCount === 1 ? "order" : "orders"}
                  </span>
                  <span
                    className="overflow-hidden whitespace-nowrap text-center text-[0.65rem] font-bold text-muted-foreground"
                    title={`${formatPhp(point.value)} from ${point.orderCount} paid orders`}
                  >
                    {point.value > 0 && revenue.length <= 14 ? formatPhp(point.value) : ""}
                  </span>
                  <div className="flex h-32 items-end sm:h-40">
                    <span
                      className="block w-full min-w-0 rounded-t-sm bg-brand transition-[height]"
                      style={{ height: point.value > 0 ? `${height}%` : "0%" }}
                      title={`${point.dateLabel}: ${formatPhp(point.value)} from ${point.orderCount} paid orders`}
                    />
                  </div>
                  <span className="overflow-hidden whitespace-nowrap pb-2 text-center text-[0.6rem] font-bold uppercase text-muted-foreground sm:text-[0.7rem]">
                    {showLabel ? (revenue.length <= 7 ? point.dayLabel : point.dateLabel) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </article>

      <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Current order status</h2>
            <p className="mt-1 text-xs text-muted-foreground">Orders created · {periodLabel}</p>
          </div>
          <p className="font-display text-3xl text-foreground">{orderTotal}</p>
        </div>

        {orderTotal === 0 ? (
          <div className="mt-4 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
            No orders were created in this period.
          </div>
        ) : (
          <div
            className="mt-4 space-y-2"
            role="img"
            aria-label={`${orderTotal} orders created during ${periodLabel}, grouped by current status. ${statuses.map((status) => `${status.label}: ${status.value}`).join("; ")}`}
          >
            {statuses.map((status) => {
              const width = orderTotal > 0 ? (status.value / orderTotal) * 100 : 0;
              return (
                <div key={status.label}>
                  <div className="mb-1 flex items-center justify-between gap-4 text-xs">
                    <span className="font-bold text-foreground">{status.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {status.value} · {orderTotal > 0 ? `${width.toFixed(0)}%` : "0%"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className={`block h-full rounded-full ${status.colorClassName}`}
                      style={{ width: status.value > 0 ? `${width}%` : "0%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
