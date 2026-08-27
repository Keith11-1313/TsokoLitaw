import Link from "next/link";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

const errorMessages: Record<string, string> = {
  provider: "Google or Supabase rejected the sign-in request. Check the configured Google client credentials, then try again.",
  exchange: "The one-time sign-in code could not be exchanged. Start again from Login in the same browser and use the same local address throughout the attempt.",
  "missing-code": "The sign-in callback did not contain an authorization code. Start again from Login and complete the Google prompt without reopening an older callback page.",
};

type AuthErrorPageProps = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const message = errorMessages[reason] ?? "The Google sign-in response could not be verified. Please return to Login and try again.";

  return (
    <CustomerPageShell>
      <SiteContainer className="py-20">
        <section className="mx-auto max-w-lg rounded-card border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-3xl text-brand">Sign-in could not be completed</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {message}
          </p>
          <Link href="/login" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-surface">
            Return to login
          </Link>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
