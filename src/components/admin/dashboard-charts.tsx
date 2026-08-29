import { formatPhp } from "@/lib/commerce";

export interface DailyRevenuePoint {
  dateLabel: string;
  dayLabel: string;
  value: number;
}

export interface OrderStatusPoint {
  label: string;
  value: number;
  colorClassName: string;
}

export function DashboardCharts({
  revenue,
  statuses,
}: {
  revenue: readonly DailyRevenuePoint[];
  statuses: readonly OrderStatusPoint[];
}) {
  const maximumRevenue = Math.max(...revenue.map((point) => point.value), 0);
  const maximumStatus = Math.max(...statuses.map((point) => point.value), 0);
  const revenueTotal = revenue.reduce((total, point) => total + point.value, 0);
  const orderTotal = statuses.reduce((total, point) => total + point.value, 0);

  return (
    <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]" aria-label="Order charts">
      <article className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Paid revenue</h2>
            <p className="mt-1 text-xs text-muted-foreground">Last 7 days from the recent order set</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-muted-foreground">7-day value</p>
            <p className="font-display text-2xl text-foreground">{formatPhp(revenueTotal)}</p>
          </div>
        </div>

        <div
          className="mt-6 grid h-56 grid-cols-7 items-end gap-2 border-b border-border px-1 sm:gap-3"
          role="img"
          aria-label={`Paid revenue for the last seven days totals ${formatPhp(revenueTotal)}. ${revenue.map((point) => `${point.dateLabel}: ${formatPhp(point.value)}`).join("; ")}`}
        >
          {revenue.map((point) => {
            const height = maximumRevenue > 0 ? (point.value / maximumRevenue) * 100 : 0;
            return (
              <div key={point.dateLabel} className="flex h-full min-w-0 flex-col justify-end gap-2">
                <span className="truncate text-center text-[0.65rem] font-bold text-muted-foreground" title={formatPhp(point.value)}>
                  {point.value > 0 ? formatPhp(point.value) : "—"}
                </span>
                <div className="flex h-40 items-end rounded-t-control bg-surface-muted">
                  <span
                    className="block w-full rounded-t-control bg-brand transition-[height]"
                    style={{ height: point.value > 0 ? `${Math.max(height, 4)}%` : "0%" }}
                    title={`${point.dateLabel}: ${formatPhp(point.value)}`}
                  />
                </div>
                <span className="pb-2 text-center text-[0.65rem] font-bold uppercase text-muted-foreground sm:text-xs">
                  {point.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Order status</h2>
            <p className="mt-1 text-xs text-muted-foreground">Current fulfillment mix</p>
          </div>
          <p className="font-display text-3xl text-foreground">{orderTotal}</p>
        </div>

        <div className="mt-6 space-y-4" role="img" aria-label={`${orderTotal} recent orders grouped by fulfillment status. ${statuses.map((status) => `${status.label}: ${status.value}`).join("; ")}`}>
          {statuses.map((status) => {
            const width = maximumStatus > 0 ? (status.value / maximumStatus) * 100 : 0;
            return (
              <div key={status.label}>
                <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                  <span className="font-bold text-foreground">{status.label}</span>
                  <span className="tabular-nums text-muted-foreground">{status.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className={`block h-full rounded-full ${status.colorClassName}`}
                    style={{ width: status.value > 0 ? `${Math.max(width, 2)}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
