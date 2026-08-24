import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { MockAdminAction } from "@/components/admin/mock-admin-action";
import { PICKUP_DATES, PICKUP_GRACE_MINUTES, PICKUP_LEAD_DAYS, PICKUP_LOCATIONS, PICKUP_TIMES } from "@/lib/pickup";

export const metadata: Metadata = { title: "Pickup Management | TsokoLitaw Admin" };

const columns: readonly AdminTableColumn[] = [
  { key: "date", label: "Customer pickup date" }, { key: "times", label: "Available times" },
  { key: "locations", label: "Customer locations" }, { key: "booked", label: "Mock bookings" },
  { key: "status", label: "Customer visibility" }, { key: "action", label: "Action" },
];

const rows: readonly Record<string, ReactNode>[] = [
  { date: <strong className="text-foreground">{PICKUP_DATES[0].adminLabel}</strong>, times: `${PICKUP_TIMES[0].label}–${PICKUP_TIMES.at(-1)?.label}`, locations: PICKUP_LOCATIONS.map((item) => item.shortLabel).join(" · "), booked: "18", status: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Shown at checkout</span>, action: <button type="button" disabled title="Editing requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Edit</button> },
  { date: <strong className="text-foreground">{PICKUP_DATES[1].adminLabel}</strong>, times: `${PICKUP_TIMES[0].label}–${PICKUP_TIMES.at(-1)?.label}`, locations: PICKUP_LOCATIONS.map((item) => item.shortLabel).join(" · "), booked: "7", status: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Shown at checkout</span>, action: <button type="button" disabled title="Editing requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Edit</button> },
];

export default function AdminPickupPage() {
  return (
    <AdminPageLayout
      activePath="/admin/pickup"
      title="Pickup Management"
      description="Dates, times, and campus locations offered during checkout."
      purpose="Publish only the pickup options the team can actually serve."
      customerImpact="Will populate the three pickup dropdowns in Checkout."
      actions={<><MockAdminAction secondary label="Add Location" title="Add mock pickup location" fieldLabel="Location name" /><MockAdminAction label="Add Date" title="Add mock pickup date" fieldLabel="Pickup date" placeholder="e.g. September 12, 2026" /></>}
    >
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <AdminDataTable caption="Checkout pickup options" columns={columns} rows={rows} minimumWidth="52rem" />
        <aside className="space-y-4">
          <section className="rounded-card border border-border bg-surface p-6"><h2 className="font-display text-xl">Campus locations</h2><ul className="mt-4 space-y-3 text-sm">{PICKUP_LOCATIONS.map((location) => <li key={location.value}><strong>{location.shortLabel}</strong><span className="block text-muted-foreground">UCC North Congress Campus</span></li>)}</ul></section>
          <section className="rounded-card border border-border bg-surface p-6"><h2 className="font-display text-xl">Checkout rules</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Lead time</dt><dd>{PICKUP_LEAD_DAYS} day</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Grace period</dt><dd>{PICKUP_GRACE_MINUTES} minutes</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Same day</dt><dd>Blocked</dd></div></dl></section>
        </aside>
      </div>
    </AdminPageLayout>
  );
}
