import type { Metadata } from "next";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { ProfileAccountShortcuts } from "@/components/customer/profile-account-shortcuts";
import { ProfileForm } from "@/components/customer/profile-form";
import { AccountDangerZone } from "@/components/customer/account-danger-zone";
import { SiteContainer } from "@/components/layout/site-container";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile | TsokoLitaw" };

export default async function ProfilePage() {
  const profile = await requireCustomer("/profile");

  return (
    <CustomerPageShell>
      <SiteContainer className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl sm:text-5xl">Your profile</h1>
          <p className="mt-3 text-muted-foreground">The details connected to your authenticated Google account.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section aria-label="Personal details">
              <ProfileForm fullName={profile.fullName} email={profile.email} mobileNumber={profile.mobileNumber} />
            </section>
            <aside className="space-y-5">
              <section className="rounded-card border border-border bg-surface p-6">
                <h2 className="font-display text-xl">Loyalty progress</h2>
                <p className="mt-2 text-sm text-muted-foreground">Order-linked loyalty will be connected during server commerce.</p>
              </section>
              <ProfileAccountShortcuts isAdmin={profile.role === "admin"} />
              <AccountDangerZone deletionScheduledFor={profile.deletionScheduledFor} />
            </aside>
          </div>
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
