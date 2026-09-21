import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Cookie,
  Newspaper,
  Package,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import {
  DashboardCharts,
  type DailyRevenuePoint,
  type OrderStatusPoint,
} from "@/components/admin/dashboard-charts";
import { QuickOperations } from "@/components/admin/quick-operations";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getAdminCatalog } from "@/lib/server-catalog";
import { getAdminDashboardSummary, resolveDashboardDateRange } from "@/lib/server-dashboard";
import { getAdminJournalPosts } from "@/lib/server-journal";
import { getAdminOrders } from "@/lib/server-orders";
import { getAdminPickup } from "@/lib/server-pickup";
import { getAdminReviews } from "@/lib/server-reviews";
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

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const admin = await requireAdmin("/admin");
  const params = await searchParams;
  const range = resolveDashboardDateRange(
    typeof params.range === "string" ? params.range : undefined,
  );
  // Expire due direct payments before loading the dashboard's read-only summaries.
  await expireDueDirectPayments();
  const [dashboard, orders, catalog, pickup, posts, reviews] = await Promise.all([
    getAdminDashboardSummary(admin.id, range),
    getAdminOrders(),
    getAdminCatalog(),
    getAdminPickup(),
    getAdminJournalPosts(),
    getAdminReviews(),
  ]);
  const openPickupDates = pickup.dates.filter((date) => date.isOpen);
  const publishedPosts = posts.filter((post) => post.status === "published").length;
  const draftPosts = posts.length - publishedPosts;
  const visibleReviews = reviews.filter((review) => review.isVisible).length;
  const statusDefinitions = [
    {
      statuses: ["PENDING_PAYMENT"],
      label: "Open payments",
      colorClassName: "bg-warning-foreground",
    },
    { statuses: ["PAID"], label: "Paid", colorClassName: "bg-info-foreground" },
    { statuses: ["CONFIRMED"], label: "Received", colorClassName: "bg-info-foreground" },
    { statuses: ["PREPARING"], label: "Preparing", colorClassName: "bg-brand" },
    {
      statuses: ["READY_FOR_PICKUP"],
      label: "Ready for pickup",
      colorClassName: "bg-info-foreground",
    },
    { statuses: ["COMPLETED"], label: "Completed", colorClassName: "bg-success-foreground" },
    {
      statuses: ["CANCELLED"],
      label: "Cancelled",
      colorClassName: "bg-muted-foreground",
    },
    {
      statuses: ["EXPIRED"],
      label: "Expired",
      colorClassName: "bg-muted-foreground",
    },
  ] as const;
  const statusPoints: OrderStatusPoint[] = statusDefinitions.map((definition) => ({
    label: definition.label,
    value: dashboard.orderOutcomes
      .filter((outcome) => (definition.statuses as readonly string[]).includes(outcome.status))
      .reduce((total, outcome) => total + outcome.count, 0),
    colorClassName: definition.colorClassName,
  }));
  const revenuePoints: DailyRevenuePoint[] = dashboard.dailySales.map((point) => {
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
      value: point.paidSales,
      orderCount: point.paidOrders,
    };
  });
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
    },
    {
      label: "Repeat buyer share",
      value: `${dashboard.current.repeatCustomerRate.toFixed(1)}%`,
      supportingText: comparisonText(
        dashboard.current.repeatCustomerRate,
        dashboard.previous.repeatCustomerRate,
        range.comparisonLabel,
        true,
      ),
      icon: Users,
    },
  ] as const;

  return (
    <AdminShell activePath="/admin">
      <AdminContent>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] leading-tight sm:text-[2.25rem]">
              Admin overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Business performance and current operational workload
            </p>
          </div>
          <form action="/admin" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted-foreground" htmlFor="dashboard-range">
                Reporting period
              </label>
              <select
                id="dashboard-range"
                name="range"
                defaultValue={range.preset}
                className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-full bg-brand px-5 text-sm font-bold text-brand-foreground transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Apply
            </button>
          </form>
        </header>

        <section
          className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
          aria-label="Dashboard summary"
        >
          {dashboardStats.map((stat) => (
            <AdminStatCard key={stat.label} compact {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <DashboardCharts
            periodLabel={range.label}
            comparisonLabel={range.comparisonLabel}
            previousRevenue={dashboard.previous.paidSales}
            revenue={revenuePoints}
            statuses={statusPoints}
          />
        </div>

        <section className="mt-8" aria-labelledby="operations-overview-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="operations-overview-heading" className="font-display text-2xl">
                Operations overview
              </h2>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                href: "/admin/orders",
                title: "Orders",
                value: `${dashboard.operations.activeFulfillment} active orders`,
                detail:
                  dashboard.operations.receiptsAwaitingReview > 0
                    ? `${dashboard.operations.receiptsAwaitingReview} payment receipts awaiting review`
                    : "No payment receipts awaiting review",
                icon: ShoppingBag,
              },
              {
                href: "/admin/products",
                title: "Catalog",
                value: `${catalog.coatings.filter((coating) => coating.isActive).length} active coatings`,
                detail: `${catalog.product.variants.filter((variant) => variant.isActive).length} box sizes · ${catalog.addons.filter((addon) => addon.isActive).length} extras`,
                icon: Cookie,
              },
              {
                href: "/admin/pickup",
                title: "Pickup",
                value: `${openPickupDates.length} open ${openPickupDates.length === 1 ? "date" : "dates"}`,
                detail: `${openPickupDates.reduce((total, date) => total + date.windows.length, 0)} published time windows`,
                icon: CalendarDays,
              },
              {
                href: "/admin/inventory",
                title: "Inventory",
                value: `${dashboard.operations.availablePieces} pieces available`,
                detail: "Across open upcoming stock dates",
                icon: Package,
              },
              {
                href: "/admin/customers",
                title: "Customers",
                value: `${dashboard.current.purchasingCustomers} purchasing customers`,
                detail: `${dashboard.current.repeatCustomers} returning during ${range.label.toLowerCase()}`,
                icon: Users,
              },
              {
                href: "/admin/journal",
                title: "Journal",
                value: `${publishedPosts} published · ${visibleReviews} reviews`,
                detail: `${draftPosts} drafts · ${reviews.filter((review) => review.isFeatured).length} featured reviews`,
                icon: Newspaper,
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

        <div className="mt-8">
          <RecentOrdersTable orders={orders} />
        </div>

        <div className="mt-8">
          <QuickOperations />
        </div>
      </AdminContent>
    </AdminShell>
  );
}
