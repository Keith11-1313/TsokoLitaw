import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { adminOrders } from "@/components/admin/admin-order-data";
import { StatusBadge } from "@/components/ui/status-badge";

export function RecentOrdersTable() {
  return (
    <section className="rounded-card border border-border bg-surface p-6 pb-[1.375rem]" aria-labelledby="recent-orders-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="recent-orders-heading" className="font-display text-2xl">
          Recent Orders
        </h2>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-brand"
        >
          View All Activity
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[11.5%]" />
            <col className="w-[23.5%]" />
            <col className="w-[23.5%]" />
            <col className="w-[13.5%]" />
            <col className="w-[13.5%]" />
            <col className="w-[14.5%]" />
          </colgroup>
          <thead>
            <tr className="h-[2.6875rem] bg-surface-muted text-xs text-foreground">
              <th className="rounded-l-control px-4 font-bold">Order ID</th>
              <th className="px-4 font-bold">Customer</th>
              <th className="px-4 font-bold">Items</th>
              <th className="px-4 font-bold">Total</th>
              <th className="px-4 font-bold">Status</th>
              <th className="rounded-r-control px-4 font-bold">Date</th>
            </tr>
          </thead>
          <tbody>
            {adminOrders.slice(0, 5).map((order) => (
              <tr key={order.id} className="h-14 border-b border-border last:border-b-0">
                <th className="px-4 font-bold text-foreground" scope="row">
                  {order.id}
                </th>
                <td className="px-4 text-foreground">{order.customer}</td>
                <td className="max-w-[15rem] truncate px-4 text-muted-foreground">
                  {order.items}
                </td>
                <td className="px-4 font-bold text-foreground">{order.total}</td>
                <td className="px-4">
                  <StatusBadge status={order.status} label={order.statusLabel} />
                </td>
                <td className="px-4 text-muted-foreground">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
