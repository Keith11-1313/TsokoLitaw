import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BadgeCheck, Gift, Repeat2, Search, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPhp } from "@/lib/commerce";
import { getAdminCustomerSummaries } from "@/lib/server-customers";

export const metadata: Metadata = { title: "Customers | TsokoLitaw Admin" };
const columns: readonly AdminTableColumn[] = [
  { key: "customer", label: "Customer" },
  { key: "account", label: "Status" },
  { key: "orders", label: "Completed purchases" },
  { key: "loyalty", label: "Loyalty activity" },
  { key: "last", label: "Last order" },
];

function formatDate(value: string | null) {
  if (!value) return "No orders yet";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric",
  }).format(new Date(value));
}

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const admin = await requireAdmin("/admin/customers");
  const parameters = await searchParams;
  const search = typeof parameters.q === "string" ? parameters.q.trim().slice(0, 100) : "";
  const customers = await getAdminCustomerSummaries(admin.id, search);
  const returningCustomers = customers.filter((customer) => customer.completedOrders >= 2).length;
  const completedRevenue = customers.reduce((total, customer) => total + customer.completedSpend, 0);
  const availableRewards = customers.reduce((total, customer) => total + customer.availableRewards, 0);
  const redeemedRewards = customers.reduce((total, customer) => total + customer.redeemedRewards, 0);
  const rows: readonly Record<string, ReactNode>[] = customers.map((customer) => ({
    customer: (
      <div className="flex min-w-56 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand">
          <UserRound aria-hidden="true" size={17} />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-foreground">
            {customer.fullName || "Unnamed customer"}
          </strong>
          <span className="block truncate text-xs">{customer.email}</span>
          {customer.mobileNumber ? <span className="block text-xs">{customer.mobileNumber}</span> : null}
        </span>
      </div>
    ),
    account: (
      <span className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
        customer.isActive
          ? "bg-success-background text-success-foreground"
          : "bg-danger-background text-danger-foreground",
      )}>
        {customer.isActive ? "Active" : "Inactive"}
      </span>
    ),
    orders: (
      <span>
        <strong className="block text-foreground">
          {customer.completedOrders} {customer.completedOrders === 1 ? "order" : "orders"}
        </strong>
        <span className="text-xs">{formatPhp(customer.completedSpend)} paid value</span>
      </span>
    ),
    loyalty: (() => {
      const threshold = Math.max(customer.loyaltyThreshold, 1);
      const progress = customer.loyaltyCompletedOrders % threshold;
      const progressPercent = Math.min(100, Math.round((progress / threshold) * 100));

      return (
        <div className="min-w-52 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <strong className="text-foreground">{progress}/{threshold} toward next reward</strong>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-label={`${progress} of ${threshold} completed orders toward the next loyalty reward`}
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={progress}
          >
            <span
              className="block h-full rounded-full bg-success-foreground"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-[0.6875rem]">
            <span className="rounded-full bg-success-background px-2.5 py-1 text-success-foreground">
              {customer.availableRewards} available
            </span>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted-foreground">
              {customer.redeemedRewards} used
            </span>
          </div>
        </div>
      );
    })(),
    last: formatDate(customer.lastOrderAt),
  }));

  return (
    <AdminPageLayout
      activePath="/admin/customers"
      title="Customers"
      description="Customer accounts, completed purchases, and loyalty activity."
      purpose="Support customers and understand completed-order activity without exposing another customer’s private order details."
      customerImpact="Uses account email as the primary contact; mobile remains optional."
      connected
      currentConnection="Connected to bounded customer, completed-order, and loyalty aggregates."
      showScopeNote={false}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard compact icon={UsersRound} label="Customers shown" value={String(customers.length)} />
        <AdminStatCard compact icon={Repeat2} label="Returning customers" value={String(returningCustomers)} />
        <AdminStatCard compact icon={Gift} label="Available rewards" value={String(availableRewards)} />
        <AdminStatCard compact icon={BadgeCheck} label="Rewards used" value={String(redeemedRewards)} />
      </div>

      <section className="mb-5 rounded-card border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Customer directory</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPhp(completedRevenue)} completed paid value across the accounts shown.
            </p>
          </div>
          <form action="/admin/customers" method="get" className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search customers</span>
              <Search
                aria-hidden="true"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={17}
              />
              <input
                name="q"
                type="search"
                defaultValue={search}
                maxLength={100}
                placeholder="Search by name or email"
                className="min-h-11 w-full rounded-full border border-border bg-background pl-11 pr-4 outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
              />
            </label>
            <button type="submit" className={cn(primaryButtonClassName, "px-6")}>Search</button>
            {search ? (
              <Link href="/admin/customers" className={cn(secondaryButtonClassName, "px-6")}>Clear</Link>
            ) : null}
          </form>
        </div>
      </section>

      <AdminDataTable caption="Customer directory" columns={columns} rows={rows} minimumWidth="64rem" />
      <p className="mt-3 text-xs text-muted-foreground">
        Showing up to 100 matching customer accounts. Order counts and financial totals include completed, paid orders only.
      </p>
    </AdminPageLayout>
  );
}
