import "server-only";

import { createPayMongoCheckoutSession } from "@/lib/paymongo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface PreparedCheckoutRow {
  prepared_payment_id: string;
  prepared_order_id: string;
  prepared_order_number: string;
  prepared_amount: number | string;
  prepared_customer_name: string;
  prepared_customer_email: string;
  prepared_customer_mobile: string | null;
  existing_checkout_url: string | null;
}

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) throw new Error("NEXT_PUBLIC_SITE_URL is required for PayMongo redirects.");
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("PayMongo redirects require HTTPS outside localhost.");
  }
  return url.origin;
}

export async function getOrCreatePayMongoCheckout(orderId: string, userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("prepare_paymongo_checkout", {
    target_order_id: orderId,
    target_user_id: userId,
  });
  if (error) throw new Error("The order is not ready for payment.", { cause: error });
  const row = (Array.isArray(data) ? data[0] : data) as PreparedCheckoutRow | null;
  if (!row) throw new Error("The payment initializer did not return an order.");
  if (row.existing_checkout_url) return row.existing_checkout_url;

  const siteUrl = getSiteUrl();
  const session = await createPayMongoCheckoutSession({
    idempotencyKey: `checkout:${row.prepared_payment_id}`,
    orderId: row.prepared_order_id,
    orderNumber: row.prepared_order_number,
    totalPhp: Number(row.prepared_amount),
    customerName: row.prepared_customer_name,
    customerEmail: row.prepared_customer_email,
    customerMobile: row.prepared_customer_mobile,
    successUrl: `${siteUrl}/payment/success?order=${encodeURIComponent(row.prepared_order_id)}`,
    cancelUrl: `${siteUrl}/checkout?payment=cancelled&order=${encodeURIComponent(row.prepared_order_id)}`,
  });

  const { error: attachError } = await supabase.rpc("attach_paymongo_checkout", {
    target_payment_id: row.prepared_payment_id,
    checkout_id: session.id,
    checkout_url: session.checkoutUrl,
  });
  if (attachError) {
    throw new Error("The PayMongo checkout reference could not be retained.", {
      cause: attachError,
    });
  }
  return session.checkoutUrl;
}
