import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { MockAdminAction } from "@/components/admin/mock-admin-action";

export const metadata: Metadata = { title: "Inventory | TsokoLitaw Admin" };

const columns: readonly AdminTableColumn[] = [
  { key: "item", label: "Item" }, { key: "stock", label: "Daily Stock" },
  { key: "reserved", label: "Reserved" }, { key: "available", label: "Available" },
  { key: "status", label: "Status" }, { key: "action", label: "Action" },
];
const inventory = [
  ["Choco Litaw", "48", "12", "36", "Healthy"], ["Cha-cha Litaw", "24", "8", "16", "Healthy"],
  ["SB Litaw", "18", "13", "5", "Low stock"], ["Caramel Litaw", "24", "6", "18", "Healthy"],
  ["Salted Caramel cups", "12", "4", "8", "Healthy"],
] as const;
const rows: readonly Record<string, ReactNode>[] = inventory.map((item) => ({
  item: <span className="font-bold text-foreground">{item[0]}</span>, stock: item[1], reserved: item[2],
  available: <span className="font-bold text-foreground">{item[3]}</span>,
  status: <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${item[4] === "Low stock" ? "bg-warning-background text-warning-foreground" : "bg-success-background text-success-foreground"}`}>{item[4]}</span>,
  action: <button type="button" disabled title="Stock persistence requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Update stock</button>,
}));

export default function AdminInventoryPage() {
  return (
    <AdminPageLayout activePath="/admin/inventory" title="Inventory" description="Preview daily stock, active reservations, and remaining availability." actions={<MockAdminAction label="Add Stock" title="Add mock stock" fieldLabel="Stock quantity" placeholder="e.g. 24" />}>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Inventory summary">
        <AdminStatCard compact label="Daily Stock" value="126" />
        <AdminStatCard compact label="Reserved" value="43" accentClassName="text-info-foreground" />
        <AdminStatCard compact label="Low Stock" value="1" accentClassName="text-warning-foreground" />
      </section>
      <div className="mt-6"><AdminDataTable caption="Inventory" columns={columns} rows={rows} /></div>
      <p className="mt-4 text-xs text-subtle-foreground">Stock changes are visual only. Atomic reservation and release logic will be implemented with the backend.</p>
    </AdminPageLayout>
  );
}
