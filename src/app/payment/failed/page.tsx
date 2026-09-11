import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { PaymentResultPage } from "@/components/customer/payment-result-page";

export const metadata: Metadata = { title: "Payment Failed | TsokoLitaw" };

export default function PaymentFailedPage() {
  return (
    <PaymentResultPage
      title="Payment not completed"
      description="We did not receive a payment confirmation from PayMongo. Your order is still waiting for payment, so you can return to checkout and try again."
      icon={XCircle}
      tone="danger"
      detailLabel="Payment status"
      detailValue="Not paid"
      primaryHref="/checkout"
      primaryLabel="Return to checkout"
    />
  );
}
