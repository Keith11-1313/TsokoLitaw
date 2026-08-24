import type { Metadata } from "next";
import { BadgePercent, Gift, Sparkles } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { SecondaryButton } from "@/components/ui/button";
import { MockAdminAction } from "@/components/admin/mock-admin-action";

export const metadata: Metadata = { title: "Promotions | TsokoLitaw Admin" };

const promotions = [
  { title: "Buy 2 Boxes Bonus", description: "Buy two eligible boxes and receive two free pieces.", state: "Active", icon: Gift },
  { title: "Student Week Treat", description: "10% mock discount for the October campus event.", state: "Scheduled", icon: Sparkles },
  { title: "Loyalty Reward", description: "Earn a free box after seven completed orders.", state: "Draft", icon: BadgePercent },
] as const;

export default function AdminPromotionsPage() {
  return (
    <AdminPageLayout activePath="/admin/promotions" title="Promotions" description="Preview promotional rules and loyalty offers before backend validation is connected." actions={<MockAdminAction label="New Promotion" title="Create mock promotion" fieldLabel="Promotion name" />}>
      <section className="grid gap-5 lg:grid-cols-3" aria-label="Promotion cards">
        {promotions.map((promotion) => {
          const Icon = promotion.icon;
          return <article key={promotion.title} className="rounded-card border border-border bg-surface p-6"><div className="flex items-start justify-between gap-4"><span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand"><Icon aria-hidden="true" size={21} /></span><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${promotion.state === "Active" ? "bg-success-background text-success-foreground" : promotion.state === "Scheduled" ? "bg-info-background text-info-foreground" : "bg-surface-muted text-muted-foreground"}`}>{promotion.state}</span></div><h2 className="mt-5 font-display text-xl">{promotion.title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{promotion.description}</p><div className="mt-6 flex gap-3"><SecondaryButton disabled className="min-h-10 flex-1 px-4 py-2" type="button">Edit</SecondaryButton><button disabled type="button" className="min-h-11 text-xs font-bold text-muted-foreground opacity-60">Disable</button></div></article>;
        })}
      </section>
      <section className="mt-6 rounded-card border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl">Promotion safety</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">The browser will never be authoritative for eligibility or discount totals. Promotion effects will be calculated and saved server-side when backend work begins.</p>
      </section>
    </AdminPageLayout>
  );
}
