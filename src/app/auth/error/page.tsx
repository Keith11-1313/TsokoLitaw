import Link from "next/link";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

const errorMessages: Record<string, string> = {
  provider: "Google couldn’t start the sign in. Please return to the login page and try again.",
  exchange:
    "We couldn’t finish signing you in. Please return to the login page and try again in this browser.",
  "missing-code":
    "The Google sign in was not completed. Please return to the login page and try again.",
  profile:
    "We signed you in, but couldn’t load your TsokoLitaw profile. Please try again or contact us if this keeps happening.",
};

type AuthErrorPageProps = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const message =
    errorMessages[reason] ??
    "We couldn’t finish signing you in with Google. Please return to the login page and try again.";

  return (
    <CustomerPageShell>
      <SiteContainer className="py-8 sm:py-12">
        <section className="mx-auto max-w-lg rounded-card border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-3xl text-brand">We couldn’t sign you in</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{message}</p>
          <Link
            href="/login"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-surface"
          >
            Return to login
          </Link>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
