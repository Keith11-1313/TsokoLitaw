import type { Metadata } from "next";
import { ArrowRight, Banknote, CalendarDays, Clock3, Cookie, Newspaper, Package, ShoppingBag, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { DashboardCharts, type DailyRevenuePoint, type OrderStatusPoint } from "@/components/admin/dashboard-charts";
import { QuickOperations } from "@/components/admin/quick-operations";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getAdminCatalog } from "@/lib/server-catalog";
import { getAdminCustomerSummaries } from "@/lib/server-customers";
import { getAdminInventory } from "@/lib/server-inventory";
import { getAdminJournalPosts } from "@/lib/server-journal";
import { getAdminOrders } from "@/lib/server-orders";
import { getAdminPickup } from "@/lib/server-pickup";
import { getAdminReviews } from "@/lib/server-reviews";

export const metadata: Metadata = {
  title: "Admin Dashboard | TsokoLitaw",
  description: "TsokoLitaw order and operations dashboard.",
};

function manilaDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function buildRevenuePoints(orders: Awaited<ReturnType<typeof getAdminOrders>>): DailyRevenuePoint[] {
  const paidByDay = new Map<string, number>();
  for (const order of orders) {
    if (order.paymentStatus !== "PAID") continue;
    const key = manilaDateKey(new Date(order.orderedAt));
    paidByDay.set(key, (paidByDay.get(key) ?? 0) + order.total);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86_400_000);
    const key = manilaDateKey(date);
    return {
      dateLabel: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" }).format(date),
      dayLabel: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short" }).format(date),
      value: paidByDay.get(key) ?? 0,
    };
  });
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin("/admin");
  const [orders, catalog, pickup, inventory, customers, posts, reviews] = await Promise.all([
    getAdminOrders(),
    getAdminCatalog(),
    getAdminPickup(),
    getAdminInventory(),
    getAdminCustomerSummaries(admin.id),
    getAdminJournalPosts(),
    getAdminReviews(),
  ]);
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
  const activeOrders = orders.filter((order) => ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status));
  const openPickupDates = pickup.dates.filter((date) => date.isOpen);
  const availablePieces = inventory.records.reduce((total, record) => total + Math.max(record.stockAvailable, 0), 0);
  const publishedPosts = posts.filter((post) => post.status === "published").length;
  const draftPosts = posts.length - publishedPosts;
  const visibleReviews = reviews.filter((review) => review.isVisible).length;
  const statusDefinitions = [
    { statuses: ["PENDING_PAYMENT"], label: "Pending payment", colorClassName: "bg-warning-foreground" },
    { statuses: ["PAID"], label: "Paid", colorClassName: "bg-info-foreground" },
    { statuses: ["CONFIRMED"], label: "Received", colorClassName: "bg-info-foreground" },
    { statuses: ["PREPARING"], label: "Preparing", colorClassName: "bg-brand" },
    { statuses: ["READY_FOR_PICKUP"], label: "Ready for pickup", colorClassName: "bg-info-foreground" },
    { statuses: ["COMPLETED"], label: "Completed", colorClassName: "bg-success-foreground" },
    { statuses: ["CANCELLED", "EXPIRED"], label: "Closed without pickup", colorClassName: "bg-muted-foreground" },
  ] as const;
  const statusPoints: OrderStatusPoint[] = statusDefinitions.map((definition) => ({
    label: definition.label,
    value: orders.filter((order) => (definition.statuses as readonly string[]).includes(order.status)).length,
    colorClassName: definition.colorClassName,
  }));
  const dashboardStats = [
    {
      label: "Recent Orders",
      value: String(orders.length),
      supportingText: "Latest 100 order snapshots",
      icon: ShoppingCart,
    },
    {
      label: "Paid Value",
      value: formatPhp(paidOrders.reduce((total, order) => total + order.total, 0)),
      supportingText: "Paid orders in the recent set",
      icon: Banknote,
    },
    {
      label: "Active Fulfillment",
      value: String(activeOrders.length),
      supportingText: "Confirmed through ready",
      icon: Clock3,
    },
    {
      label: "Available Pieces",
      value: String(availablePieces),
      supportingText: "Across upcoming stock dates",
      icon: Package,
    },
  ] as const;

  return (
    <AdminShell activePath="/admin">
      <AdminContent className="lg:px-12 lg:py-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2.25rem] leading-tight">
              Admin overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer ordering, pickup, and content operations
            </p>
          </div>
          <span className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-bold">
            <span className="size-2 rounded-full bg-success-foreground" aria-hidden="true" />
            Live operations
          </span>
        </header>

        <section className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard summary">
          {dashboardStats.map((stat) => (
            <AdminStatCard key={stat.label} {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <DashboardCharts revenue={buildRevenuePoints(orders)} statuses={statusPoints} />
        </div>

        <section className="mt-8" aria-labelledby="operations-overview-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="operations-overview-heading" className="font-display text-2xl">Operations overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">Live summaries from every connected Admin area</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { href: "/admin/orders", title: "Orders", value: `${activeOrders.length} active orders`, detail: `${orders.filter((order) => order.status === "COMPLETED").length} completed in the recent set`, icon: ShoppingBag },
              { href: "/admin/products", title: "Catalog", value: `${catalog.coatings.filter((coating) => coating.isActive).length} active coatings`, detail: `${catalog.product.variants.filter((variant) => variant.isActive).length} box sizes · ${catalog.addons.filter((addon) => addon.isActive).length} add-ons`, icon: Cookie },
              { href: "/admin/pickup", title: "Pickup", value: `${openPickupDates.length} open ${openPickupDates.length === 1 ? "date" : "dates"}`, detail: `${openPickupDates.reduce((total, date) => total + date.windows.length, 0)} published time windows`, icon: CalendarDays },
              { href: "/admin/inventory", title: "Inventory", value: `${availablePieces} pieces available`, detail: `${inventory.records.length} stocked ${inventory.records.length === 1 ? "date" : "dates"}`, icon: Package },
              { href: "/admin/customers", title: "Customers", value: `${customers.length} accounts shown`, detail: `${customers.filter((customer) => customer.completedOrders >= 2).length} returning customers`, icon: Users },
              { href: "/admin/journal", title: "Journal", value: `${publishedPosts} published · ${visibleReviews} reviews`, detail: `${draftPosts} drafts · ${reviews.filter((review) => review.isFeatured).length} featured reviews`, icon: Newspaper },
            ].map((area) => {
              const Icon = area.icon;
              return (
                <Link key={area.title} href={area.href} className="group rounded-card border border-border bg-surface p-5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-brand"><Icon aria-hidden="true" size={19} /></span>
                    <ArrowRight aria-hidden="true" className="text-muted-foreground transition-transform group-hover:translate-x-1" size={17} />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">{area.title}</p>
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
