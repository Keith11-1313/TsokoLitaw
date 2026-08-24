import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { MockAdminAction } from "@/components/admin/mock-admin-action";

export const metadata: Metadata = { title: "Inventory | TsokoLitaw Admin" };

const columns: readonly AdminTableColumn[] = [
  { key: "item", label: "Inventory item" }, { key: "type", label: "Type" },
  { key: "stock", label: "Daily stock" }, { key: "reserved", label: "Reserved" },
  { key: "available", label: "Available" }, { key: "status", label: "Customer effect" },
  { key: "action", label: "Action" },
];

const inventory = [
  ["Box of 4", "Box size", "40", "8", "32", "Orderable"],
  ["Box of 6", "Box size", "28", "7", "21", "Orderable"],
  ["Box of 8", "Box size", "18", "14", "4", "Low stock"],
  ["Crushed Nuts", "Coating", "Available", "—", "—", "Orderable"],
  ["Cookies and Cream", "Coating", "Available", "—", "—", "Orderable"],
  ["Extra sea salt cream", "Add-on", "12 cups", "4", "8", "Orderable"],
] as const;

const rows: readonly Record<string, ReactNode>[] = inventory.map((item) => ({
  item: <strong className="text-foreground">{item[0]}</strong>, type: item[1], stock: item[2], reserved: item[3], available: <strong className="text-foreground">{item[4]}</strong>,
  status: <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${item[5] === "Low stock" ? "bg-warning-background text-warning-foreground" : "bg-success-background text-success-foreground"}`}>{item[5]}</span>,
  action: <button type="button" disabled title="Stock persistence requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Update</button>,
}));

export default function AdminInventoryPage() {
  return (
    <AdminPageLayout
      activePath="/admin/inventory"
      title="Inventory"
      description="Daily box stock and availability for coatings and add-ons."
      purpose="Prevent customers from ordering boxes or options that operations cannot fulfill."
      customerImpact="Will produce available, low-stock, and sold-out states in the product builder."
      actions={<MockAdminAction label="Add Stock" title="Add mock stock" fieldLabel="Stock quantity" placeholder="e.g. 24" />}
    >
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Inventory summary"><AdminStatCard compact label="Boxes Today" value="86" /><AdminStatCard compact label="Reserved Boxes" value="29" accentClassName="text-info-foreground" /><AdminStatCard compact label="Low Stock" value="1" accentClassName="text-warning-foreground" /></section>
      <div className="mt-6"><AdminDataTable caption="Customer-orderable inventory" columns={columns} rows={rows} minimumWidth="58rem" /></div>
      <p className="mt-4 text-xs text-subtle-foreground">Stock changes are visual only. Atomic reservation and release logic is required before this can control customer availability.</p>
    </AdminPageLayout>
  );
}
