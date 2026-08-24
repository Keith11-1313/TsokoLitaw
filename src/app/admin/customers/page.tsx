import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Search, UserRound } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminStatCard } from "@/components/admin/admin-stat-card";

export const metadata: Metadata = { title: "Customers | TsokoLitaw Admin" };
const columns: readonly AdminTableColumn[] = [{ key: "customer", label: "Customer" }, { key: "orders", label: "Completed Orders" }, { key: "spend", label: "Total Spend" }, { key: "loyalty", label: "Loyalty" }, { key: "last", label: "Last Order" }];
const rows: readonly Record<string, ReactNode>[] = [
  ["Maria Santos", "maria@gmail.com", "8", "₱824.00", "1 reward available", "Aug 23, 2026"], ["Juan Dela Cruz", "juan@gmail.com", "5", "₱535.00", "5 of 7", "Aug 22, 2026"], ["Sophia Lim", "sophia@gmail.com", "3", "₱318.00", "3 of 7", "Aug 19, 2026"],
].map((item) => ({ customer: <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-surface-muted"><UserRound size={17} /></span><span><strong className="block text-foreground">{item[0]}</strong><span className="text-xs">{item[1]}</span></span></div>, orders: item[2], spend: <strong className="text-foreground">{item[3]}</strong>, loyalty: item[4], last: item[5] }));
export default function AdminCustomersPage() { return <AdminPageLayout activePath="/admin/customers" title="Customers" description="Static customer summaries for the UI phase."><div className="mb-6 grid gap-4 sm:grid-cols-3"><AdminStatCard compact label="Customers" value="48" /><AdminStatCard compact label="Returning" value="31" /><AdminStatCard compact label="Rewards Available" value="6" /></div><label className="relative mb-5 block max-w-sm"><span className="sr-only">Search customers</span><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><input type="search" placeholder="Search customers" className="min-h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></label><AdminDataTable caption="Customers" columns={columns} rows={rows} minimumWidth="46rem" /></AdminPageLayout>; }
