import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Search, UserRound } from "lucide-react";
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
  { key: "account", label: "Account" },
  { key: "orders", label: "Completed Orders" },
  { key: "spend", label: "Completed Spend" },
  { key: "last", label: "Last Order" },
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
  const rows: readonly Record<string, ReactNode>[] = customers.map((customer) => ({
    customer: <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-surface-muted"><UserRound size={17} /></span><span><strong className="block text-foreground">{customer.fullName || "Unnamed customer"}</strong><span className="text-xs">{customer.email}</span>{customer.mobileNumber ? <span className="block text-xs">{customer.mobileNumber}</span> : null}</span></div>,
    account: <span className={cn("rounded-full px-3 py-1 text-xs font-bold", customer.isActive ? "bg-success-background text-success-foreground" : "bg-danger-background text-danger-foreground")}>{customer.isActive ? "Active" : "Inactive"}</span>,
    orders: customer.completedOrders,
    spend: <strong className="text-foreground">{formatPhp(customer.completedSpend)}</strong>,
    last: formatDate(customer.lastOrderAt),
  }));

  return <AdminPageLayout activePath="/admin/customers" title="Customers" description="Real Google-account identities and completed-order activity." purpose="Support customers and understand completed-order activity without exposing another customer’s private order details." customerImpact="Uses account email as the primary contact; mobile remains optional. Loyalty earning and redemption begin in Phase 12." connected currentConnection="Connected to bounded customer and completed-order aggregates."><div className="mb-6 grid gap-4 sm:grid-cols-3"><AdminStatCard compact label="Customers shown" value={String(customers.length)} /><AdminStatCard compact label="Returning customers" value={String(returningCustomers)} /><AdminStatCard compact label="Completed value" value={formatPhp(completedRevenue)} /></div><form action="/admin/customers" method="get" className="mb-5 flex max-w-xl flex-col gap-3 sm:flex-row"><label className="relative block min-w-0 flex-1"><span className="sr-only">Search customers</span><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><input name="q" type="search" defaultValue={search} maxLength={100} placeholder="Search customers by name or email" className="min-h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></label><button type="submit" className={cn(primaryButtonClassName, "px-6")}>Search</button>{search ? <Link href="/admin/customers" className={cn(secondaryButtonClassName, "px-6")}>Clear</Link> : null}</form><AdminDataTable caption="Customers" columns={columns} rows={rows} minimumWidth="50rem" /><p className="mt-3 text-xs text-muted-foreground">Showing up to 100 matching customer accounts. Financial totals include completed, paid orders only.</p></AdminPageLayout>;
}
