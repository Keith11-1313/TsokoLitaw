import type { Metadata } from "next";
import { Save } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { UncontrolledCustomSelect } from "@/components/ui/custom-select";
import { PICKUP_DAILY_CUTOFF, PICKUP_LEAD_DAYS, PICKUP_SLOT_CAPACITY, PICKUP_SLOT_INTERVAL_MINUTES } from "@/lib/pickup";

export const metadata: Metadata = { title: "Settings | TsokoLitaw Admin" };

export default function AdminSettingsPage() {
  return (
    <AdminPageLayout activePath="/admin/settings" title="Settings" description="Shared operational defaults; TsokoLitaw brand identity is fixed." purpose="Keep cross-feature rules such as contact email, cutoff, lead time, and loyalty in one place." customerImpact="These values will affect checkout guidance, email communication, pickup eligibility, and loyalty progress." actions={<PrimaryButton type="button" disabled title="Saving requires backend persistence"><Save size={17} />Save Changes</PrimaryButton>}>
      <form className="grid gap-6 xl:grid-cols-2" aria-label="Admin settings">
        <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl">Customer support</h2>
          <div className="mt-6 space-y-5">
            <FormField id="settings-support-email" label="Support Email" inputProps={{ type: "email", defaultValue: "tsokolitaw@gmail.com" }} />
            <FormField id="settings-location" label="Primary Location" inputProps={{ defaultValue: "UCC Congress, Caloocan" }} />
          </div>
        </section>
        <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl">Order configuration</h2>
          <div className="mt-6 space-y-5">
            <UncontrolledCustomSelect label="Daily cut-off" options={[{ value: "5", label: PICKUP_DAILY_CUTOFF }, { value: "4", label: "4:00 PM" }]} />
            <FormField id="settings-lead-days" label="Pickup Lead Days" inputProps={{ type: "number", defaultValue: PICKUP_LEAD_DAYS, min: 1 }} />
            <FormField id="settings-slot-interval" label="Pickup Slot Interval (minutes)" inputProps={{ type: "number", defaultValue: PICKUP_SLOT_INTERVAL_MINUTES, min: 15, step: 15 }} />
            <FormField id="settings-slot-capacity" label="Pickup Capacity per Slot (boxes)" inputProps={{ type: "number", defaultValue: PICKUP_SLOT_CAPACITY, min: 1 }} />
            <UncontrolledCustomSelect label="Pickup grace period" options={[{ value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }, { value: "45", label: "45 minutes" }]} />
            <FormField id="settings-loyalty" label="Completed orders per reward" inputProps={{ type: "number", defaultValue: 7, min: 1 }} />
          </div>
        </section>
        <section className="rounded-card border border-border bg-surface p-6 sm:p-8 xl:col-span-2">
          <h2 className="font-display text-2xl">Notifications</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-control bg-surface-control p-4 text-sm"><input type="checkbox" defaultChecked className="mt-1 size-4 accent-brand" /><span><strong className="block text-foreground">Order confirmations</strong><span className="text-muted-foreground">Email customers after verified payment.</span></span></label>
            <label className="flex items-start gap-3 rounded-control bg-surface-control p-4 text-sm"><input type="checkbox" defaultChecked className="mt-1 size-4 accent-brand" /><span><strong className="block text-foreground">Ready for pickup</strong><span className="text-muted-foreground">Notify customers when preparation is complete.</span></span></label>
          </div>
          <p className="mt-5 text-xs text-subtle-foreground">Infrastructure secrets and provider keys are intentionally excluded from this interface.</p>
        </section>
      </form>
    </AdminPageLayout>
  );
}
