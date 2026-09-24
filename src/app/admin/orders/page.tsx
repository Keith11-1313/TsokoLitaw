import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { OrderManagementTable } from "@/components/admin/order-management-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { getAdminOrders } from "@/lib/server-orders";
import type { OrderStatus } from "@/components/ui/status-badge";

const orderStatuses = new Set<OrderStatus>([
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const metadata: Metadata = {
  title: "Orders | TsokoLitaw Admin",
  description: "Manage paid TsokoLitaw orders through campus pickup fulfillment.",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; status?: string | string[] }>;
}) {
  await requireAdmin("/admin/orders");
  const params = await searchParams;
  const initialQuery = typeof params.query === "string" ? params.query.slice(0, 80) : "";
  const requestedStatus = typeof params.status === "string" ? params.status : "";
  const initialStatus = orderStatuses.has(requestedStatus as OrderStatus)
    ? (requestedStatus as OrderStatus)
    : "ALL";
  const orders = await getAdminOrders();
  const orderStats = [
    { label: "Loaded Orders", value: String(orders.length) },
    {
      label: "Open Payments",
      value: String(orders.filter((order) => order.status === "PENDING_PAYMENT").length),
      accentClassName: "text-warning-foreground",
    },
    {
      label: "Active Pickup",
      value: String(
        orders.filter((order) =>
          ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status),
        ).length,
      ),
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
      <AdminContent>
        <header>
          <h1 className="font-display text-[2rem] leading-tight sm:text-[2.25rem]">Orders</h1>
        </header>

        <section
          className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
          aria-label="Order summary"
        >
          {orderStats.map((stat) => (
            <AdminStatCard key={stat.label} compact {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <OrderManagementTable
            orders={orders}
            initialQuery={initialQuery}
            initialStatus={initialStatus}
          />
        </div>
      </AdminContent>
    </AdminShell>
  );
}
