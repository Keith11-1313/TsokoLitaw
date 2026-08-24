import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { MockAdminAction } from "@/components/admin/mock-admin-action";
import { BOX_VARIANTS, COATINGS, EXTRA_COATING_PRICE, EXTRA_SAUCE_PRICE, formatPhp } from "@/lib/commerce";

export const metadata: Metadata = { title: "Catalog | TsokoLitaw Admin" };

const columns: readonly AdminTableColumn[] = [
  { key: "item", label: "Customer-facing item" },
  { key: "type", label: "Type" },
  { key: "price", label: "Pricing" },
  { key: "availability", label: "Customer availability" },
  { key: "action", label: "Action" },
];

const rows: readonly Record<string, ReactNode>[] = [
  ...BOX_VARIANTS.map((variant) => ({
    item: <div><strong className="block text-foreground">{variant.label}</strong><span className="text-xs text-muted-foreground">{variant.pieceCount} chocolate-filled pieces</span></div>,
    type: "Box size",
    price: <strong className="text-foreground">{formatPhp(variant.price)}</strong>,
    availability: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Shown in builder</span>,
    action: <button type="button" disabled title="Editing requires backend persistence" aria-label={`Edit ${variant.label}`} className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"><Pencil aria-hidden="true" size={15} /></button>,
  })),
  ...COATINGS.map((coating) => ({
    item: <div className="flex items-center gap-3"><Image src={coating.imageSrc} alt="" width={44} height={44} className="size-11 rounded-control object-cover" /><div><strong className="block text-foreground">{coating.name}</strong><span className="line-clamp-1 max-w-xs text-xs text-muted-foreground">{coating.description}</span></div></div>,
    type: "Coating",
    price: `First type included; +${formatPhp(EXTRA_COATING_PRICE)} per additional type`,
    availability: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Shown in builder</span>,
    action: <button type="button" disabled title="Editing requires backend persistence" aria-label={`Edit ${coating.name}`} className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"><Pencil aria-hidden="true" size={15} /></button>,
  })),
  {
    item: <div><strong className="block text-foreground">Extra sea salt cream</strong><span className="text-xs text-muted-foreground">Optional cup added to a configured box</span></div>,
    type: "Add-on",
    price: <strong className="text-foreground">{formatPhp(EXTRA_SAUCE_PRICE)} per cup</strong>,
    availability: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Shown in builder</span>,
    action: <button type="button" disabled title="Editing requires backend persistence" aria-label="Edit extra sea salt cream" className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"><Pencil aria-hidden="true" size={15} /></button>,
  },
];

export default function AdminProductsPage() {
  return (
    <AdminPageLayout
      activePath="/admin/products"
      title="Catalog"
      description="Boxes, coatings, add-ons, images, and PHP prices used by Our Creations."
      purpose="Define everything a customer can configure and its displayed price."
      customerImpact="Feeds the Our Creations builder and future server-side checkout pricing."
      actions={<MockAdminAction label="Add Catalog Item" title="Add mock catalog entry" fieldLabel="Item name" />}
    >
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Catalog summary">
        <AdminStatCard compact label="Box Sizes" value={String(BOX_VARIANTS.length)} />
        <AdminStatCard compact label="Coatings" value={String(COATINGS.length)} accentClassName="text-success-foreground" />
        <AdminStatCard compact label="Add-ons" value="1" accentClassName="text-warning-foreground" />
      </section>
      <div className="mt-6"><AdminDataTable caption="Customer catalog" columns={columns} rows={rows} minimumWidth="58rem" /></div>
    </AdminPageLayout>
  );
}
