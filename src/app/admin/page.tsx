import type { Metadata } from "next";
import { Banknote, Clock3, ShoppingCart, UserRoundPlus } from "lucide-react";
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
    value: "156",
    supportingText: "↑ 12% from last week",
    icon: ShoppingCart,
  },
  {
    label: "Revenue",
    value: "₱45,200",
    supportingText: "↑ 8.4% monthly target",
    icon: Banknote,
  },
  {
    label: "New Customers",
    value: "24",
    supportingText: "Active today",
    icon: UserRoundPlus,
  },
  {
    label: "Pending Orders",
    value: "8",
    supportingText: "Requires action",
    icon: Clock3,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <AdminShell activePath="/admin">
      <AdminContent className="lg:px-12 lg:py-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2.25rem] leading-tight">
              Welcome back, Admin
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Today is Tuesday, October 14, 2025
            </p>
          </div>
          <span className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-bold">
            <span className="size-2 rounded-full bg-success-foreground" aria-hidden="true" />
            Store Open
          </span>
        </header>

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
