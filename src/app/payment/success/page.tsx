import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PaymentResultPage } from "@/components/customer/payment-result-page";

export const metadata: Metadata = { title: "Payment Successful | TsokoLitaw" };

export default function PaymentSuccessPage() {
  return <PaymentResultPage title="Payment successful" description="Your mock payment is complete and the order is ready for confirmation. A receipt and pickup details would normally be sent by email." icon={CheckCircle2} tone="success" detailLabel="Order reference" detailValue="#ORD-008" primaryHref="/orders/ORD-008" primaryLabel="View Order" />;
}
