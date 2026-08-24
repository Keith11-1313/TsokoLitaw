import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { MockAdminAction } from "@/components/admin/mock-admin-action";

export const metadata: Metadata = { title: "Pickup Management | TsokoLitaw Admin" };

const dateColumns: readonly AdminTableColumn[] = [
  { key: "date", label: "Pickup Date" }, { key: "window", label: "Time Window" },
  { key: "capacity", label: "Capacity" }, { key: "booked", label: "Booked" },
  { key: "status", label: "Status" }, { key: "action", label: "Action" },
];
const dateRows: readonly Record<string, ReactNode>[] = [
  { date: <span className="font-bold text-foreground">Saturday, Oct 18</span>, window: "1:00–5:00 PM", capacity: "40 orders", booked: "18", status: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Open</span>, action: <button type="button" disabled title="Editing requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Edit</button> },
  { date: <span className="font-bold text-foreground">Monday, Oct 20</span>, window: "1:00–5:00 PM", capacity: "40 orders", booked: "7", status: <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Open</span>, action: <button type="button" disabled title="Editing requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Edit</button> },
  { date: <span className="font-bold text-foreground">Tuesday, Oct 21</span>, window: "1:00–5:00 PM", capacity: "30 orders", booked: "0", status: <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">Draft</span>, action: <button type="button" disabled title="Editing requires backend setup" className="min-h-11 text-xs font-bold text-brand opacity-60">Edit</button> },
];

export default function AdminPickupPage() {
  return (
    <AdminPageLayout activePath="/admin/pickup" title="Pickup Management" description="Configure mock pickup dates, capacities, and customer-facing locations." actions={<><MockAdminAction secondary label="Add Location" title="Add mock pickup location" fieldLabel="Location name" /><MockAdminAction label="Add Date" title="Add mock pickup date" fieldLabel="Pickup date" placeholder="e.g. September 5, 2026" /></>}>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <AdminDataTable caption="Pickup dates" columns={dateColumns} rows={dateRows} minimumWidth="44rem" />
        <aside className="space-y-4">
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-display text-xl">Active location</h2>
            <p className="mt-4 text-sm font-bold text-foreground">UCC North Congress Campus</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Caloocan, Metro Manila</p>
            <span className="mt-4 inline-flex rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">Available</span>
          </section>
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-display text-xl">Pickup rules</h2>
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Lead time</dt><dd>2 days</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Grace period</dt><dd>30 minutes</dd></div></dl>
          </section>
        </aside>
      </div>
    </AdminPageLayout>
  );
}
