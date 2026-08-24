import type { Metadata } from "next";
import { LoginPreview } from "@/components/auth/login-preview";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "Login | TsokoLitaw",
  description: "Sign in to continue with TsokoLitaw.",
};

export default function LoginPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-24">
        <section className="mx-auto max-w-md rounded-card border border-border bg-surface p-7 text-center sm:p-10">
          <LoginPreview />
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
