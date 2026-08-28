import type { Metadata } from "next";
import { CheckCircle2, Clock3 } from "lucide-react";
import { PaymentResultPage } from "@/components/customer/payment-result-page";
import { ClearPaidCart } from "@/components/checkout/clear-paid-cart";
import { requireCustomer } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Payment Status | TsokoLitaw" };

export default async function PaymentSuccessPage({
  searchParams,
}: PageProps<"/payment/success">) {
  const profile = await requireCustomer("/payment/success");
  const { order } = await searchParams;
  const orderId = typeof order === "string" ? order : "";
  const supabase = createAdminSupabaseClient();
  const { data } = orderId
    ? await supabase
      .from("orders")
      .select("order_number, payment_status")
      .eq("id", orderId)
      .eq("user_id", profile.id)
      .maybeSingle()
    : { data: null };
  const isPaid = data?.payment_status === "PAID";

  return (
    <>
      {isPaid ? <ClearPaidCart /> : null}
      <PaymentResultPage
      title={isPaid ? "Payment confirmed" : "Payment is being verified"}
      description={isPaid
        ? `PayMongo confirmed payment for order ${data.order_number}. TsokoLitaw can now prepare it for fulfillment.`
        : "Returning from PayMongo does not confirm payment by itself. We’ll update the order after the signed PayMongo notification arrives."}
      icon={isPaid ? CheckCircle2 : Clock3}
      tone="success"
      detailLabel="Payment status"
      detailValue={isPaid ? "Paid" : "Awaiting verification"}
      primaryHref="/orders"
      primaryLabel="View my orders"
      />
    </>
  );
}
