import { ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react";
import { adminOrders } from "@/components/admin/admin-order-data";
import { StatusBadge } from "@/components/ui/status-badge";

const paginationItems = ["1", "2", "3"] as const;

export function OrderManagementTable() {
  return (
    <section
      className="rounded-card border border-border bg-surface p-6 pb-[1.375rem]"
      aria-label="Order management list"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[10.5%]" />
            <col className="w-[15.5%]" />
            <col className="w-[10.5%]" />
            <col className="w-[10.5%]" />
            <col className="w-[7.5%]" />
            <col className="w-[11.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="h-[3.75rem] bg-surface-muted text-xs text-foreground">
              <th className="rounded-l-control px-4 font-bold">ID</th>
              <th className="px-4 font-bold">Customer</th>
              <th className="px-4 font-bold">Contact Email</th>
              <th className="px-4 font-bold">Items Ordered</th>
              <th className="px-4 font-bold">Qty</th>
              <th className="px-4 font-bold">Total</th>
              <th className="px-4 font-bold">Status</th>
              <th className="px-4 font-bold">Date</th>
              <th className="rounded-r-control px-4 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminOrders.map((order) => (
              <tr key={order.id} className="h-[3.75rem] border-b border-border last:border-b-0">
                <th className="truncate px-4 font-bold text-foreground" scope="row">
                  {order.id}
                </th>
                <td className="truncate px-4 text-foreground">{order.customer}</td>
                <td className="truncate px-4 text-muted-foreground">{order.email}</td>
                <td className="truncate px-4 text-muted-foreground">{order.items}</td>
                <td className="truncate px-4 text-foreground">{order.quantity}</td>
                <td className="truncate px-4 font-bold text-foreground">{order.total}</td>
                <td className="px-4">
                  <StatusBadge status={order.status} label={order.statusLabel} />
                </td>
                <td className="truncate px-4 text-muted-foreground">{order.date}</td>
                <td className="px-4">
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      disabled
                      title="Order details require backend data"
                      aria-label={`View ${order.id}`}
                      className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"
                    >
                      <Eye aria-hidden="true" size={15} />
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Order updates require backend persistence"
                      aria-label={`Edit ${order.id}`}
                      className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"
                    >
                      <Pencil aria-hidden="true" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-4 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Showing all 8 mock orders</p>
        <nav className="flex items-center gap-2" aria-label="Order pagination">
          <button
            type="button"
            disabled
            aria-label="Previous page"
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface opacity-60"
          >
            <ChevronLeft aria-hidden="true" size={16} />
          </button>
          {paginationItems.map((page) => (
            <button
              key={page}
              type="button"
              disabled
              aria-current={page === "1" ? "page" : undefined}
              className={`flex size-11 items-center justify-center rounded-lg border text-xs ${
                page === "1"
                  ? "border-brand bg-brand font-bold text-surface"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            disabled
            aria-label="Next page"
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface opacity-60"
          >
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        </nav>
      </footer>
    </section>
  );
}
