import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerAccountGate } from "@/components/auth/customer-account-gate";
import { OrderReviewForm } from "@/components/feedback/order-review-form";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { getMockOrder } from "@/lib/mock-orders";

export const metadata: Metadata = { title: "Review Order | TsokoLitaw" };
export default async function ReviewOrderPage({ params }: PageProps<"/orders/[orderId]/review">) { const { orderId } = await params; const order = getMockOrder(orderId); if (!order || order.status !== "COMPLETED" || order.reviewed) notFound(); return <CustomerPageShell activePath="/orders"><CustomerAccountGate><SiteContainer className="py-12 sm:py-16"><div className="mx-auto max-w-2xl"><h1 className="font-display text-4xl">How was your TsokoLitaw?</h1><p className="mt-3 mb-8 text-muted-foreground">This review is linked to your completed order and does not expose your email publicly.</p><OrderReviewForm orderId={orderId} /></div></SiteContainer></CustomerAccountGate></CustomerPageShell>; }
