import type { Metadata } from "next";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminScopeNote } from "@/components/admin/admin-scope-note";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { OrderManagementTable } from "@/components/admin/order-management-table";
import { AdminContent } from "@/components/layout/admin-content";
import { UncontrolledCustomSelect } from "@/components/ui/custom-select";

export const metadata: Metadata = {
  title: "Order Management | TsokoLitaw",
  description: "Mock TsokoLitaw order management interface.",
};

const orderStats = [
  { label: "All Orders", value: "8" },
  {
    label: "Pending Payment",
    value: "1",
    accentClassName: "text-warning-foreground",
  },
  {
    label: "Active Pickup",
    value: "3",
    accentClassName: "text-info-foreground",
  },
  {
    label: "Completed",
    value: "4",
    accentClassName: "text-success-foreground",
  },
] as const;

export default function AdminOrdersPage() {
  return (
    <AdminShell activePath="/admin/orders">
      <AdminContent className="lg:px-12 lg:py-4!">
        <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-display text-[2.25rem] leading-tight">Order Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Search mock orders and review their fulfillment status.</p>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-[minmax(0,17.5rem)_11rem] xl:w-auto">
            <label className="block space-y-2">
              <span className="block text-sm font-bold text-foreground">Search orders</span>
              <span className="relative block">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                <input type="search" placeholder="Order ID, name, or email" className="min-h-12 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-focus focus:ring-2 focus:ring-focus/20" />
              </span>
            </label>
            <UncontrolledCustomSelect label="Status filter" options={[{ value: "all", label: "All statuses" }, { value: "pending", label: "Pending payment" }, { value: "confirmed", label: "Confirmed" }, { value: "preparing", label: "Preparing" }, { value: "completed", label: "Completed" }]} />
          </div>
        </header>

        <div className="mt-6"><AdminScopeNote purpose="Review paid orders and move them through campus pickup fulfillment." customerImpact="Status changes will appear in My Orders and determine when a completed order can be reviewed." /></div>

        <section className="mt-[1.9375rem] grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order summary">
          {orderStats.map((stat) => (
            <AdminStatCard key={stat.label} compact {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <OrderManagementTable />
        </div>
      </AdminContent>
    </AdminShell>
  );
}
