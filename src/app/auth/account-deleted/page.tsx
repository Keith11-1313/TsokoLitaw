import type { Metadata } from "next";
import { UserX } from "lucide-react";
import Link from "next/link";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account Deleted | TsokoLitaw",
  robots: { index: false, follow: false },
};

export default function DeletedAccountPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-24">
        <section className="mx-auto max-w-lg rounded-card border border-border bg-surface p-7 text-center sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-muted text-brand">
            <UserX aria-hidden="true" size={26} />
          </span>
          <p className="mt-6 font-script text-5xl leading-none text-brand">Account deleted</p>
          <h1 className="mt-4 font-display text-3xl text-foreground">This account can no longer sign in</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The 90-day deletion period for this TsokoLitaw account has ended. Its access is permanently disabled, but your Google account was not changed.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/" className={primaryButtonClassName}>Return home</Link>
            <a href="mailto:tsokolitaw@gmail.com" className={secondaryButtonClassName}>Contact support</a>
          </div>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
