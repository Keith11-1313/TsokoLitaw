import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { OrderReviewForm } from "@/components/feedback/order-review-form";
import { SiteContainer } from "@/components/layout/site-container";
import { requireCustomer } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { getCustomerReviewContext } from "@/lib/server-reviews";

export const metadata: Metadata = {
  title: "Review Order | TsokoLitaw",
  description: "Review a completed TsokoLitaw campus pickup order.",
};

export default async function ReviewOrderPage({ params }: PageProps<"/orders/[orderId]/review">) {
  const { orderId } = await params;
  const profile = await requireCustomer(`/orders/${orderId}/review`);
  if (!isUuid(orderId)) notFound();
  const reviewContext = await getCustomerReviewContext(profile.id, orderId);
  if (!reviewContext) notFound();

  return (
    <CustomerPageShell activePath="/orders">
      <SiteContainer className="py-10 sm:py-14">
        <Link href={`/orders/${orderId}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand">
          <ArrowLeft aria-hidden="true" size={18} />
          Order details
        </Link>
        <header className="mt-6 max-w-3xl">
          <p className="font-script text-3xl text-brand">Completed order</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Review {reviewContext.orderNumber}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {reviewContext.itemSummary || "Tell us about your TsokoLitaw order and campus pickup experience."}
          </p>
        </header>
        <div className="mt-8 max-w-3xl">
          <OrderReviewForm
            orderId={reviewContext.orderId}
            orderNumber={reviewContext.orderNumber}
            existingReview={reviewContext.existingReview}
          />
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
