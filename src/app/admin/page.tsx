import type { Metadata } from "next";
import { Banknote, Clock3, PackageCheck, ShoppingCart } from "lucide-react";
import { AdminScopeNote } from "@/components/admin/admin-scope-note";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { QuickOperations } from "@/components/admin/quick-operations";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { AdminContent } from "@/components/layout/admin-content";

export const metadata: Metadata = {
  title: "Admin Dashboard | TsokoLitaw",
  description: "Mock TsokoLitaw administration dashboard.",
};

const dashboardStats = [
  {
    label: "Total Orders",
    value: "8",
    supportingText: "Mock orders in this UI",
    icon: ShoppingCart,
  },
  {
    label: "Revenue",
    value: "₱688.00",
    supportingText: "Sum of mock order totals",
    icon: Banknote,
  },
  {
    label: "Active Pickups",
    value: "3",
    supportingText: "Confirmed or preparing",
    icon: Clock3,
  },
  {
    label: "Completed",
    value: "4",
    supportingText: "Eligible for loyalty progress",
    icon: PackageCheck,
  },
] as const;

export default function AdminDashboardPage() {
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
            Mock data · not live
          </span>
        </header>

        <div className="mt-6"><AdminScopeNote purpose="Surface the operational areas that need attention in one place." customerImpact="Summarizes the orders, fulfillment, and catalog data behind the customer experience." /></div>

        <section className="mt-[1.6875rem] grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard summary">
          {dashboardStats.map((stat) => (
            <AdminStatCard key={stat.label} {...stat} />
          ))}
        </section>

        <div className="mt-8">
          <RecentOrdersTable />
        </div>

        <div className="mt-[1.8125rem]">
          <QuickOperations />
        </div>
      </AdminContent>
    </AdminShell>
  );
}
