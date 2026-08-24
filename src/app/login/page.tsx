import type { Metadata } from "next";
import { LogIn, ShieldCheck } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { PrimaryButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Login | TsokoLitaw",
  description: "Sign in to continue with TsokoLitaw.",
};

export default function LoginPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-24">
        <section className="mx-auto max-w-md rounded-card border border-border bg-surface p-7 text-center sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-muted text-brand">
            <LogIn aria-hidden="true" size={26} />
          </span>
          <h1 className="mt-6 font-script text-[3.25rem] leading-none text-brand">
            Sign in to TsokoLitaw
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            New and returning customers use Google to order, track campus
            pickups, and review completed orders.
          </p>
          <PrimaryButton className="mt-8 w-full" type="button" disabled>
            Continue with Google
          </PrimaryButton>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-subtle-foreground">
            <ShieldCheck aria-hidden="true" size={15} />
            Google sign-in will be connected in the authentication phase.
          </p>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
