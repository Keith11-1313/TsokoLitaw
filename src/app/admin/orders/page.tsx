import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminScopeNote } from "@/components/admin/admin-scope-note";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { OrderManagementTable } from "@/components/admin/order-management-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { getAdminOrders } from "@/lib/server-orders";

export const metadata: Metadata = {
  title: "Order Management | TsokoLitaw",
  description: "Manage paid TsokoLitaw orders through campus pickup fulfillment.",
};

export default async function AdminOrdersPage() {
  await requireAdmin("/admin/orders");
  const orders = await getAdminOrders();
  const orderStats = [
    { label: "Recent Orders", value: String(orders.length) },
    {
      label: "Pending Payment",
      value: String(orders.filter((order) => order.status === "PENDING_PAYMENT").length),
      accentClassName: "text-warning-foreground",
    },
    {
      label: "Active Pickup",
      value: String(orders.filter((order) => ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status)).length),
      accentClassName: "text-info-foreground",
    },
    {
      label: "Completed",
      value: String(orders.filter((order) => order.status === "COMPLETED").length),
      accentClassName: "text-success-foreground",
    },
  ] as const;

  return (
    <AdminShell activePath="/admin/orders">
      <AdminContent className="lg:px-12 lg:py-4!">
        <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-display text-[2.25rem] leading-tight">Order Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Search real orders and move paid boxes through campus pickup fulfillment.</p>
          </div>
        </header>

        <div className="mt-6"><AdminScopeNote purpose="Review paid orders and move them through campus pickup fulfillment." customerImpact="Status changes appear in My Orders and determine when a completed order can be reviewed." currentConnection="Connected to real order snapshots. Fulfillment changes are saved, customer-visible, and audited." connected /></div>

        <section className="mt-[1.9375rem] grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order summary">
          {orderStats.map((stat) => (
            <AdminStatCard key={stat.label} compact {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <OrderManagementTable orders={orders} />
        </div>
      </AdminContent>
    </AdminShell>
  );
}
