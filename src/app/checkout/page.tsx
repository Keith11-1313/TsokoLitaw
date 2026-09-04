import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutContent } from "@/components/checkout/checkout-content";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { requireCustomer } from "@/lib/auth";
import { getCheckoutAvailability } from "@/lib/server-commerce";
import { getCustomerLoyaltyStatus } from "@/lib/server-loyalty";

export const metadata: Metadata = {
  title: "Checkout | TsokoLitaw",
  description: "Review a TsokoLitaw order and available campus pickup schedules.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const profile = await requireCustomer("/checkout");
  if (profile.deletionScheduledFor) redirect("/profile");
  const { payment, order } = await searchParams;
  const [availability, loyalty] = await Promise.all([
    getCheckoutAvailability(),
    getCustomerLoyaltyStatus(profile.id),
  ]);

  return (
    <CustomerPageShell>
      <SiteContainer className="py-8 sm:py-12">
        <h1 className="font-display text-4xl text-foreground">Checkout</h1>
        <div className="mt-7 sm:mt-9"><CheckoutContent availability={availability} profile={profile} loyalty={loyalty} resumeOrderId={payment === "cancelled" && typeof order === "string" ? order : null} /></div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
