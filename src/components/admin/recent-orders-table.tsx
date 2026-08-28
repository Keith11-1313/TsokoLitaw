import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPhp } from "@/lib/commerce";
import type { AdminOrderSummary } from "@/lib/server-orders";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function RecentOrdersTable({ orders }: { orders: AdminOrderSummary[] }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 pb-[1.375rem]" aria-labelledby="recent-orders-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="recent-orders-heading" className="font-display text-2xl">Recent Orders</h2>
        <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-muted-foreground hover:text-brand">
          Manage orders
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>

      {orders.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[56rem] table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="h-[2.6875rem] bg-surface-muted text-xs text-foreground">
                <th className="rounded-l-control px-4 font-bold">Order</th>
                <th className="px-4 font-bold">Customer</th>
                <th className="px-4 font-bold">Items</th>
                <th className="px-4 font-bold">Total</th>
                <th className="px-4 font-bold">Status</th>
                <th className="rounded-r-control px-4 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="h-14 border-b border-border last:border-b-0">
                  <th className="px-4 font-bold text-foreground" scope="row">{order.orderNumber}</th>
                  <td className="px-4 text-foreground">{order.customerName}</td>
                  <td className="max-w-[15rem] truncate px-4 text-muted-foreground">{order.itemSummary || "No item snapshot"}</td>
                  <td className="px-4 font-bold text-foreground">{formatPhp(order.total)}</td>
                  <td className="px-4"><StatusBadge status={order.status} /></td>
                  <td className="px-4 text-muted-foreground">{formatDate(order.orderedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No orders have been created yet.</p>
      )}
    </section>
  );
}
