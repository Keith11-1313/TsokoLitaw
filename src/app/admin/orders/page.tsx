import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { OrderManagementTable } from "@/components/admin/order-management-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { getAdminOrders } from "@/lib/server-orders";

export const metadata: Metadata = {
  title: "Orders | TsokoLitaw Admin",
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
            <h1 className="font-display text-[2.25rem] leading-tight">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">Search real orders and move paid boxes through campus pickup fulfillment.</p>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Order summary">
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
