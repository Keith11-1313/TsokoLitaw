import type { Metadata } from "next";
import { CustomerAccountGate } from "@/components/auth/customer-account-gate";
import { CustomerPageHeading } from "@/components/customer/customer-page-heading";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { OrderDetailView } from "@/components/orders/order-detail-view";

export const metadata: Metadata = { title: "Order Detail | TsokoLitaw" };

export default async function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  return (
    <CustomerPageShell activePath="/orders">
      <CustomerAccountGate><SiteContainer className="py-16 sm:py-20">
        <CustomerPageHeading title="Your order" description="Follow your order from payment confirmation to pickup." />
        <div className="mt-10"><OrderDetailView orderId={orderId} /></div>
      </SiteContainer></CustomerAccountGate>
    </CustomerPageShell>
  );
}
