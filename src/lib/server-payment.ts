import "server-only";

import {
  createPayMongoCheckoutSession,
  expirePayMongoCheckoutSession,
} from "@/lib/paymongo";
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

interface DueCheckoutRow {
  due_payment_id: string;
  due_order_id: string;
  due_checkout_id: string;
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
    try {
      await expirePayMongoCheckoutSession(session.id);
    } catch (expirationError) {
      console.error("[paymongo] Unable to close an unattached checkout session", {
        checkoutId: session.id,
        error: expirationError,
      });
    }
    throw new Error("The PayMongo checkout reference could not be retained.", {
      cause: attachError,
    });
  }
  return session.checkoutUrl;
}

export async function expireDuePayMongoCheckouts(batchLimit = 100) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("list_due_paymongo_checkouts", {
    batch_limit: Math.min(Math.max(Math.trunc(batchLimit), 1), 100),
  });
  if (error) throw new Error("Due PayMongo checkouts could not be loaded.", { cause: error });

  let expired = 0;
  let deferred = 0;
  const failures: string[] = [];

  for (const row of (data ?? []) as DueCheckoutRow[]) {
    try {
      await expirePayMongoCheckoutSession(row.due_checkout_id);
      const { data: orderExpired, error: expirationError } = await supabase.rpc(
        "expire_paymongo_order",
        {
          target_payment_id: row.due_payment_id,
          checkout_id: row.due_checkout_id,
        },
      );
      if (expirationError) throw expirationError;
      if (orderExpired) expired += 1;
      else deferred += 1;
    } catch (expirationError) {
      console.error("[paymongo-expirations] Checkout expiration failed", {
        orderId: row.due_order_id,
        checkoutId: row.due_checkout_id,
        error: expirationError,
      });
      failures.push(row.due_order_id);
    }
  }

  return {
    examined: (data ?? []).length,
    expired,
    deferred,
    failures,
  };
}
