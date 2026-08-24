import type { Metadata } from "next";
import { CheckoutContent } from "@/components/checkout/checkout-content";
import { CustomerPageHeading } from "@/components/customer/customer-page-heading";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "Checkout | TsokoLitaw",
  description: "Prepare a mock TsokoLitaw checkout.",
};

export default function CheckoutPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-20">
        <CustomerPageHeading title="Checkout" description="Review your treats and tell us when and where you would like to pick them up." />
        <div className="mt-10"><CheckoutContent /></div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
