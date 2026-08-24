import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { MockAdminAction } from "@/components/admin/mock-admin-action";

export const metadata: Metadata = { title: "Products | TsokoLitaw Admin" };

const columns: readonly AdminTableColumn[] = [
  { key: "product", label: "Product" }, { key: "category", label: "Category" },
  { key: "price", label: "Base Price" }, { key: "availability", label: "Availability" },
  { key: "updated", label: "Updated" }, { key: "actions", label: "Actions" },
];

const products = [
  ["4-piece box", "Box variant", "₱60.00", "Available", "Today"],
  ["6-piece box", "Box variant", "₱85.00", "Available", "Today"],
  ["8-piece box", "Box variant", "₱110.00", "Available", "Today"],
  ["Additional coating", "Coating rule", "₱5.00", "Available", "Today"],
  ["Extra sea salt cream", "Add-on", "₱18.00", "Available", "Today"],
] as const;

const rows: readonly Record<string, ReactNode>[] = products.map((product, index) => ({
  product: <div className="flex items-center gap-3"><span className={`size-10 rounded-control ${index === 1 ? "bg-[#87965d]" : index === 2 ? "bg-[#a95159]" : "bg-[#7a4a2c]"}`} aria-hidden="true" /><span className="font-bold text-foreground">{product[0]}</span></div>,
  category: product[1], price: <span className="font-bold text-foreground">{product[2]}</span>,
  availability: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">{product[3]}</span>,
  updated: product[4],
  actions: <button type="button" disabled title="Editing requires backend persistence" aria-label={`Edit ${product[0]}`} className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"><Pencil aria-hidden="true" size={15} /></button>,
}));

export default function AdminProductsPage() {
  return (
    <AdminPageLayout activePath="/admin/products" title="Products" description="Manage mock box variants, coatings, add-ons, and PHP pricing." actions={<MockAdminAction label="Add Product" title="Add mock product entry" fieldLabel="Product or variant name" />}>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Product summary">
        <AdminStatCard compact label="Box Variants" value="3" />
        <AdminStatCard compact label="Coatings" value="4" accentClassName="text-success-foreground" />
        <AdminStatCard compact label="Add-ons" value="1" accentClassName="text-warning-foreground" />
      </section>
      <div className="mt-6"><AdminDataTable caption="Products" columns={columns} rows={rows} minimumWidth="52rem" /></div>
    </AdminPageLayout>
  );
}
