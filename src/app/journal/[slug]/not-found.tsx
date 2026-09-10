import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";

export default function JournalPostNotFound() {
  return (
    <CustomerPageShell activePath="/journal">
      <SiteContainer className="grid min-h-[32rem] place-items-center py-12">
        <section className="w-full max-w-lg rounded-card border border-border bg-surface p-7 text-center sm:p-10">
          <p className="font-display text-4xl text-brand">Post not found</p>
          <h1 className="mt-3 font-display text-3xl text-foreground">
            This Journal post isn’t available
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The link may be outdated, or the post may no longer be published.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/journal" className={primaryButtonClassName}>
              <ArrowLeft aria-hidden="true" size={17} />
              Back to Journal
            </Link>
            <Link href="/" className={secondaryButtonClassName}>
              Return home
            </Link>
          </div>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
