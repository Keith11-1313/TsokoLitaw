import type { Metadata } from "next";
import { Gift, UserRound } from "lucide-react";
import { CustomerAccountGate } from "@/components/auth/customer-account-gate";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { ProfileAccountShortcuts } from "@/components/customer/profile-account-shortcuts";
import { SiteContainer } from "@/components/layout/site-container";
import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export const metadata: Metadata = { title: "Profile | TsokoLitaw" };

export default function ProfilePage() {
  return (
    <CustomerPageShell>
      <CustomerAccountGate>
        <SiteContainer className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h1 className="font-display text-4xl sm:text-5xl">Your profile</h1>
            <p className="mt-3 text-muted-foreground">A static preview of the details connected to your future Google account.</p>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
              <form className="rounded-card border border-border bg-surface p-6 sm:p-8">
                <div className="flex items-center gap-3"><UserRound className="text-brand" aria-hidden="true" /><h2 className="font-display text-2xl">Personal details</h2></div>
                <div className="mt-6 space-y-5">
                  <FormField id="profile-name" label="Full name" inputProps={{ defaultValue: "Maria Santos" }} />
                  <FormField id="profile-email" label="Google email" hint="Your email is the main way we’ll contact you and cannot be edited here." inputProps={{ defaultValue: "maria@gmail.com", readOnly: true }} />
                  <FormField id="profile-mobile" label="Mobile number (optional)" hint="Add a number only if you also want pickup updates by phone." inputProps={{ type: "tel", placeholder: "+63 900 000 0000", autoComplete: "tel" }} />
                </div>
                <PrimaryButton className="mt-6" type="button" disabled>Saving available after authentication</PrimaryButton>
              </form>
              <aside className="space-y-5">
                <section className="rounded-card border border-border bg-surface p-6">
                  <Gift className="text-brand" aria-hidden="true" />
                  <h2 className="mt-4 font-display text-xl">Loyalty progress</h2>
                  <p className="mt-2 text-sm text-muted-foreground">4 of 7 completed orders</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-[57%] rounded-full bg-brand" /></div>
                  <p className="mt-3 text-xs text-muted-foreground">Three more completed orders until a free 4-piece box.</p>
                </section>
                <ProfileAccountShortcuts />
              </aside>
            </div>
          </div>
        </SiteContainer>
      </CustomerAccountGate>
    </CustomerPageShell>
  );
}
