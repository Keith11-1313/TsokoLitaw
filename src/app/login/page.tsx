import type { Metadata } from "next";
import { LoginPreview } from "@/components/auth/login-preview";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { getAuthProfile } from "@/lib/auth";
import { getSafeNextPath } from "@/lib/auth-redirect";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login | TsokoLitaw",
  description: "Sign in to continue with TsokoLitaw.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(typeof params.next === "string" ? params.next : null, "/profile");
  const profile = await getAuthProfile();
  if (profile) redirect(nextPath);

  return (
    <CustomerPageShell>
      <SiteContainer className="py-8 sm:py-12">
        <section className="mx-auto max-w-md rounded-card border border-border bg-surface p-7 text-center sm:p-10">
          <LoginPreview nextPath={nextPath} />
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
