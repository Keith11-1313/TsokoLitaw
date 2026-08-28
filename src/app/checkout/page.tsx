import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutContent } from "@/components/checkout/checkout-content";
import { CustomerPageHeading } from "@/components/customer/customer-page-heading";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { requireCustomer } from "@/lib/auth";
import { getCheckoutAvailability } from "@/lib/server-commerce";

export const metadata: Metadata = {
  title: "Checkout | TsokoLitaw",
  description: "Review a TsokoLitaw order and available campus pickup schedules.",
};

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const profile = await requireCustomer("/checkout");
  if (profile.deletionScheduledFor) redirect("/profile");
  const { payment, order } = await searchParams;
  const availability = await getCheckoutAvailability();

  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-20">
        <CustomerPageHeading title="Checkout" description="Review your treats and tell us when and where you would like to pick them up." />
        <div className="mt-10"><CheckoutContent availability={availability} profile={profile} resumeOrderId={payment === "cancelled" && typeof order === "string" ? order : null} /></div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
