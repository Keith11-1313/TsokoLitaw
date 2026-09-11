import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGcashRecipientName } from "@/lib/gcash-qr";

// Cookie-backed reads retain RLS. Caller still authenticates the page/action.
export async function getManualPayment(orderId: string) {
  const client = await createServerSupabaseClient();
  const [payment, submissions, order] = await Promise.all([
    client
      .from("payments")
      .select("manual_qr_payload, status")
      .eq("order_id", orderId)
      .eq("provider", "manual_gcash")
      .maybeSingle(),
    client
      .from("manual_payment_submissions")
      .select(
        "id, reported_reference, reported_amount, reported_paid_at, reported_recipient, status, submitted_at, rejection_reason",
      )
      .eq("order_id", orderId)
      .order("submitted_at", { ascending: false })
      .limit(10),
    client.from("orders").select("status, payment_expires_at").eq("id", orderId).maybeSingle(),
  ]);
  if (payment.error || submissions.error || order.error)
    throw new Error("Payment details could not be loaded.");
  const expiresAt = order.data?.payment_expires_at ?? null;
  const accepting =
    order.data?.status === "PENDING_PAYMENT" &&
    payment.data?.status === "PENDING" &&
    !!expiresAt &&
    Date.parse(expiresAt) > Date.now();
  return payment.data
    ? {
        ...payment.data,
        recipientName: payment.data.manual_qr_payload
          ? getGcashRecipientName(payment.data.manual_qr_payload)
          : "",
        accepting,
        expiresAt,
        submissions: submissions.data ?? [],
      }
    : null;
}

export type ManualPaymentDetails = NonNullable<Awaited<ReturnType<typeof getManualPayment>>>;
