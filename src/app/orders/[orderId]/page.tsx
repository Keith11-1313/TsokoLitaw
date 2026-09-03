import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { OrderReviewModal } from "@/components/feedback/order-review-modal";
import { SiteContainer } from "@/components/layout/site-container";
import { OrderActions } from "@/components/orders/order-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCustomer } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getCustomerOrderDetail } from "@/lib/server-orders";
import { getCustomerReviewContext } from "@/lib/server-reviews";

export const metadata: Metadata = { title: "Order Detail | TsokoLitaw" };

export default async function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  const profile = await requireCustomer(`/orders/${orderId}`);
  const order = await getCustomerOrderDetail(profile.id, orderId);
  if (!order) notFound();
  const reviewContext = order.status === "COMPLETED"
    ? await getCustomerReviewContext(profile.id, orderId)
    : null;

  const pickupDate = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric" }).format(new Date(`${order.pickupDate}T00:00:00+08:00`));
  return (
    <CustomerPageShell activePath="/orders">
      <SiteContainer className="py-8 sm:py-12">
        <Link href="/orders" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand"><ArrowLeft aria-hidden="true" size={18} />My orders</Link>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-4xl sm:text-5xl">{order.orderNumber}</h1><StatusBadge status={order.status} label={["PAID", "CONFIRMED"].includes(order.status) ? "Received" : undefined} /></div>
          <p className="font-display text-2xl">{formatPhp(order.total)}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <section className="rounded-card border border-border bg-surface p-6 sm:p-8" aria-labelledby="items-title">
            <h2 id="items-title" className="font-display text-2xl">Your box</h2>
            <ul className="mt-5 divide-y divide-border">
              {order.items.map((item) => <li key={item.id} className="flex justify-between gap-5 py-4"><div><p className="font-bold">{item.name} × {item.quantity}</p><p className="mt-1 text-sm text-muted-foreground">{item.coatings}</p></div><p className="shrink-0 font-bold">{formatPhp(item.lineTotal)}</p></li>)}
            </ul>
            <div className="mt-6 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2"><p className="flex gap-2"><CalendarDays aria-hidden="true" size={18} />{pickupDate} · {order.pickupWindow}</p><p className="flex gap-2"><MapPin aria-hidden="true" size={18} />{order.pickupLocation}</p></div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-card border border-border bg-surface p-6"><h2 className="font-display text-2xl">Payment</h2><dl className="mt-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Status</dt><dd className="font-bold">{order.paymentStatus.toLowerCase()}</dd></div></dl></section>
            {reviewContext ? <section className="rounded-card border border-border bg-surface p-6"><h2 className="font-display text-2xl">Share your experience</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Each completed order can receive one customer review.</p><OrderReviewModal orderId={reviewContext.orderId} orderNumber={reviewContext.orderNumber} itemSummary={reviewContext.itemSummary} existingReview={reviewContext.existingReview} /></section> : null}
            {order.canCancel ? <section className="rounded-card border border-danger-foreground/30 bg-surface p-6"><h2 className="font-display text-2xl text-danger-foreground">Cancel unpaid order</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">You may cancel while payment is still pending.</p><div className="mt-5"><OrderActions orderId={order.id} orderNumber={order.orderNumber} /></div></section> : order.paymentStatus === "PAID" ? <section className="rounded-card border border-border bg-surface p-6"><h2 className="font-display text-2xl">Paid-order concerns</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">For cancellation or settlement concerns involving a paid order, coordinate directly with TsokoLitaw in person. The website does not process refunds.</p></section> : null}
          </aside>
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
