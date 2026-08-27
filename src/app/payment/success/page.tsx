import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PaymentResultPage } from "@/components/customer/payment-result-page";

export const metadata: Metadata = { title: "Payment Successful | TsokoLitaw" };

export default function PaymentSuccessPage() {
  return <PaymentResultPage title="Payment preview complete" description="This is only a UI preview. No payment was charged and no order was created." icon={CheckCircle2} tone="success" detailLabel="Connection status" detailValue="PayMongo not connected" primaryHref="/orders" primaryLabel="View order history" />;
}
