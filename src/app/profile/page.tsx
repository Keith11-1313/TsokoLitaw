import type { Metadata } from "next";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { ProfileAccountShortcuts } from "@/components/customer/profile-account-shortcuts";
import { ProfileForm } from "@/components/customer/profile-form";
import { LoyaltyProgressCard } from "@/components/customer/loyalty-progress-card";
import { AccountDangerZone } from "@/components/customer/account-danger-zone";
import { SiteContainer } from "@/components/layout/site-container";
import { requireCustomer } from "@/lib/auth";
import { getCustomerLoyaltyStatus } from "@/lib/server-loyalty";

export const metadata: Metadata = {
  title: "Profile | TsokoLitaw",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProfilePage() {
  const profile = await requireCustomer("/profile");
  const loyalty = await getCustomerLoyaltyStatus(profile.id);

  return (
    <CustomerPageShell>
      <SiteContainer className="py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl sm:text-5xl">Your profile</h1>
          <p className="mt-3 text-muted-foreground">The details connected to your authenticated Google account.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section aria-label="Personal details">
              <ProfileForm fullName={profile.fullName} email={profile.email} mobileNumber={profile.mobileNumber} />
            </section>
            <aside className="space-y-5">
              <LoyaltyProgressCard loyalty={loyalty} />
              <ProfileAccountShortcuts isAdmin={profile.role === "admin"} />
              <AccountDangerZone deletionScheduledFor={profile.deletionScheduledFor} />
            </aside>
          </div>
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
