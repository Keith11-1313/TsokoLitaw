import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { secondaryButtonClassName } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-20">
        <section className="mx-auto max-w-lg rounded-card border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-3xl text-brand">Administrator access required</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Your Google account is signed in, but it is not one of the approved TsokoLitaw administrator accounts.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className={secondaryButtonClassName}>Return home</Link>
            <form action={signOutAction}><button type="submit" className="min-h-11 rounded-full bg-brand px-6 text-sm font-bold text-surface">Sign in with another account</button></form>
          </div>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
