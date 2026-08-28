import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { PaymentResultPage } from "@/components/customer/payment-result-page";

export const metadata: Metadata = { title: "Payment Failed | TsokoLitaw" };

export default function PaymentFailedPage() {
  return <PaymentResultPage title="Payment not completed" description="PayMongo did not confirm a payment. Your order remains pending until its payment window expires, and you may safely return to checkout to try again." icon={XCircle} tone="danger" detailLabel="Payment status" detailValue="Not paid" primaryHref="/checkout" primaryLabel="Return to checkout" />;
}
