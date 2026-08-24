import type { Metadata } from "next";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { OrderManagementTable } from "@/components/admin/order-management-table";
import { AdminContent } from "@/components/layout/admin-content";
import { UncontrolledCustomSelect } from "@/components/ui/custom-select";

export const metadata: Metadata = {
  title: "Order Management | TsokoLitaw",
  description: "Mock TsokoLitaw order management interface.",
};

const orderStats = [
  { label: "All Orders", value: "245" },
  {
    label: "Pending",
    value: "18",
    accentClassName: "text-warning-foreground",
  },
  {
    label: "Processing",
    value: "12",
    accentClassName: "text-info-foreground",
  },
  {
    label: "Completed",
    value: "215",
    accentClassName: "text-success-foreground",
  },
] as const;

export default function AdminOrdersPage() {
  return (
    <AdminShell activePath="/admin/orders">
      <AdminContent className="lg:px-12 lg:py-4!">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-display text-[2.25rem] leading-tight">
            Order Management
          </h1>
          <div className="flex flex-col gap-4 sm:pt-8 md:flex-row">
            <label className="relative block">
              <span className="sr-only">Search orders</span>
              <Search
                aria-hidden="true"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={17}
              />
              <input
                type="search"
                placeholder="Search orders..."
                className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-focus focus:ring-2 focus:ring-focus/20 sm:w-[17.5rem]"
              />
            </label>
            <UncontrolledCustomSelect className="min-w-44" label="Status filter" options={[{ value: "all", label: "All statuses" }, { value: "pending", label: "Pending" }, { value: "preparing", label: "Preparing" }, { value: "completed", label: "Completed" }]} />
          </div>
        </header>

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
