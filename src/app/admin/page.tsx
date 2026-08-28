import type { Metadata } from "next";
import { Banknote, Clock3, PackageCheck, ShoppingCart } from "lucide-react";
import { AdminScopeNote } from "@/components/admin/admin-scope-note";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { QuickOperations } from "@/components/admin/quick-operations";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getAdminOrders } from "@/lib/server-orders";

export const metadata: Metadata = {
  title: "Admin Dashboard | TsokoLitaw",
  description: "TsokoLitaw order and operations dashboard.",
};

export default async function AdminDashboardPage() {
  await requireAdmin("/admin");
  const orders = await getAdminOrders();
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
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
      label: "Active Pickups",
      value: String(orders.filter((order) => ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status)).length),
      supportingText: "Received through ready",
      icon: Clock3,
    },
    {
      label: "Completed",
      value: String(orders.filter((order) => order.status === "COMPLETED").length),
      supportingText: "Eligible for review",
      icon: PackageCheck,
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
            Order data live
          </span>
        </header>

        <div className="mt-6"><AdminScopeNote purpose="Surface the operational areas that need attention in one place." customerImpact="Summarizes the orders and fulfillment data behind the customer experience." currentConnection="Order summaries are live. Operational tools outside order fulfillment remain preview-only." connected /></div>

        <section className="mt-[1.6875rem] grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard summary">
          {dashboardStats.map((stat) => (
            <AdminStatCard key={stat.label} {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <RecentOrdersTable orders={orders} />
        </div>

        <div className="mt-[1.8125rem]">
          <QuickOperations />
        </div>
      </AdminContent>
    </AdminShell>
  );
}
