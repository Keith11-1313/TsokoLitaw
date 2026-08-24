import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { PaymentResultPage } from "@/components/customer/payment-result-page";

export const metadata: Metadata = { title: "Payment Failed | TsokoLitaw" };

export default function PaymentFailedPage() {
  return <PaymentResultPage title="Payment unsuccessful" description="The mock payment could not be completed. No order status has been changed, and you may safely return to checkout." icon={XCircle} tone="danger" detailLabel="Payment status" detailValue="Not completed" primaryHref="/checkout" primaryLabel="Return to Checkout" />;
}
