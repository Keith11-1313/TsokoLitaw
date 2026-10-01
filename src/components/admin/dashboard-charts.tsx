import { formatPhp } from "@/lib/commerce";

export interface DailyRevenuePoint {
  dateLabel: string;
  dayLabel: string;
  rawDate: string;
  value: number;
  orderCount: number;
  partial?: boolean;
}

export interface MixPoint {
  label: string;
  value: number;
  detail: string;
}

function linePath(values: readonly number[], width: number, height: number) {
  const maximum = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / maximum) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function TrendPlot({
  values,
  label,
  formatValue,
}: {
  values: readonly number[];
  label: string;
  formatValue: (value: number) => string;
}) {
  const width = 640;
  const height = 150;
  const maximum = Math.max(...values, 1);
  const path = linePath(values, width, height);
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-foreground">{label}</span>
        <span className="text-muted-foreground">Peak {formatValue(maximum)}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full overflow-visible"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height - height * fraction}
            y2={height - height * fraction}
            stroke="var(--border)"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="var(--brand)" opacity="0.12" />
        <path
          d={path}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function SalesTrendChart({
  revenue,
  periodLabel,
}: {
  revenue: readonly DailyRevenuePoint[];
  periodLabel: string;
}) {
  const revenueTotal = revenue.reduce((total, point) => total + point.value, 0);
  const orderTotal = revenue.reduce((total, point) => total + point.orderCount, 0);
  const hasData = revenueTotal > 0 || orderTotal > 0;
  return (
    <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Sales trend</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirmed payment date · {periodLabel}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{formatPhp(revenueTotal)}</strong> from {orderTotal}{" "}
          paid {orderTotal === 1 ? "order" : "orders"}
        </p>
      </div>
      {!hasData ? (
        <div className="mt-6 flex h-52 items-center justify-center rounded-control bg-surface-muted px-6 text-center text-sm text-muted-foreground">
          No paid sales in this period yet.
        </div>
      ) : (
        <figure className="mt-6" aria-labelledby="sales-trend-caption">
          <figcaption id="sales-trend-caption" className="sr-only">
            Sales and paid-order trends for {periodLabel}. Exact values are available in the table.
          </figcaption>
          <div className="space-y-5">
            <TrendPlot
              values={revenue.map((point) => point.value)}
              label="Paid sales"
              formatValue={formatPhp}
            />
            <TrendPlot
              values={revenue.map((point) => point.orderCount)}
              label="Paid orders"
              formatValue={String}
            />
          </div>
          <div className="mt-2 flex justify-between text-[0.7rem] text-muted-foreground">
            <span>{revenue[0]?.dateLabel}</span>
            <span>{revenue.at(-1)?.dateLabel}</span>
          </div>
          <details className="mt-4 rounded-control border border-border bg-background">
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              View exact chart data
            </summary>
            <div className="max-h-72 overflow-auto border-t border-border">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead className="sticky top-0 bg-surface-muted">
                  <tr>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2 text-right">Paid sales</th>
                    <th className="px-4 py-2 text-right">Paid orders</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((point) => (
                    <tr
                      key={`${point.dateLabel}-${point.dayLabel}`}
                      className="border-t border-border"
                    >
                      <th className="px-4 py-2 font-medium" scope="row">
                        {point.dateLabel}
                        {point.partial ? " (partial)" : ""}
                      </th>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatPhp(point.value)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{point.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </figure>
      )}
    </article>
  );
}

export function FunnelChart({
  created,
  paid,
  completed,
  lost,
  periodLabel,
}: {
  created: number;
  paid: number;
  completed: number;
  lost: number;
  periodLabel: string;
}) {
  const stages = [
    { label: "Created", value: created },
    { label: "Paid", value: paid },
    { label: "Completed", value: completed },
  ];
  return (
    <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-display text-2xl">Order conversion</h2>
      <p className="mt-1 text-xs text-muted-foreground">Orders created · {periodLabel}</p>
      {created === 0 ? (
        <p className="mt-5 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
          No orders were created in this period.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {stages.map((stage, index) => {
            const width = (stage.value / created) * 100;
            const prior = index === 0 ? created : (stages[index - 1]?.value ?? created);
            return (
              <li key={stage.label}>
                <div className="mb-1 flex items-end justify-between gap-4 text-sm">
                  <span className="font-bold text-foreground">{stage.label}</span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {stage.value} · {width.toFixed(0)}%
                    {index > 0
                      ? ` · ${prior > 0 ? ((stage.value / prior) * 100).toFixed(0) : 0}% from prior`
                      : ""}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
          <li className="rounded-control bg-surface-muted px-4 py-3 text-sm">
            <span className="font-bold text-foreground">Cancelled or expired</span>
            <span className="float-right tabular-nums text-muted-foreground">
              {lost} · {((lost / created) * 100).toFixed(0)}%
            </span>
          </li>
        </ol>
      )}
    </article>
  );
}

function RankedMix({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: readonly MixPoint[];
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const maximum = Math.max(...points.map((point) => point.value), 1);
  return (
    <article className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {total === 0 ? (
        <p className="mt-5 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
          No matching paid purchases in this period.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {points.map((point) => (
            <li key={point.label}>
              <div className="mb-1 flex items-end justify-between gap-3 text-sm">
                <span className="font-bold text-foreground">{point.label}</span>
                <span className="text-right text-xs text-muted-foreground">
                  {point.detail} · {((point.value / total) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${(point.value / maximum) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
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
      <RankedMix
        title="Coatings purchased"
        subtitle={`Paid-order pieces · ${periodLabel}`}
        points={coatings}
      />
      <RankedMix
        title="Extras purchased"
        subtitle={`Paid extras · ${periodLabel}`}
        points={extras}
      />
    </section>
  );
}
