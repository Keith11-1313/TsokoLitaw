import "server-only";

import { buildOrderConfirmationEmail } from "@/lib/notification-email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface DeliveryRow {
  id: string;
  order_id: string;
  recipient_email: string;
  idempotency_key: string;
  event_type: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "DELIVERED" | "FAILED";
  attempt_count: number;
  last_attempt_at: string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  total: number | string;
  pickup_date: string;
  pickup_window_snapshot: string;
  pickup_location_snapshot: string;
  order_items: Array<{
    variant_name_snapshot: string;
    quantity: number;
    order_item_coatings: Array<{ coating_name_snapshot: string; piece_count: number }> | null;
    order_item_addons: Array<{ addon_name_snapshot: string; quantity: number }> | null;
  }> | null;
}

const MAX_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

function getRequiredEmailEnvironment() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!apiKey || !from || !siteUrl) {
    throw new Error("Transactional email environment is incomplete.");
  }
  return { apiKey, from, siteUrl: new URL(siteUrl).origin };
}

async function sendWithResend(input: {
  apiKey: string;
  from: string;
  to: string;
  idempotencyKey: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  const body = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!response.ok || typeof body?.id !== "string" || !body.id) {
    throw new Error(`Resend rejected the message with status ${response.status}.`);
  }
  return body.id;
}

function canClaim(delivery: DeliveryRow, now: number) {
  if (delivery.attempt_count >= MAX_ATTEMPTS) return false;
  if (delivery.status === "PENDING" || delivery.status === "FAILED") return true;
  return delivery.status === "PROCESSING"
    && delivery.last_attempt_at !== null
    && new Date(delivery.last_attempt_at).getTime() <= now - PROCESSING_TIMEOUT_MS;
}

async function dispatchDelivery(delivery: DeliveryRow) {
  const supabase = createAdminSupabaseClient();
  const attemptStartedAt = new Date().toISOString();
  const nextAttempt = delivery.attempt_count + 1;
  const claim = await supabase
    .from("notification_deliveries")
    .update({
      status: "PROCESSING",
      attempt_count: nextAttempt,
      last_attempt_at: attemptStartedAt,
      last_error: null,
    })
    .eq("id", delivery.id)
    .eq("status", delivery.status)
    .eq("attempt_count", delivery.attempt_count)
    .select("id")
    .maybeSingle();
  if (claim.error || !claim.data) return false;

  try {
    if (delivery.event_type !== "order.confirmed") {
      throw new Error("Unsupported transactional email event.");
    }
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, customer_name, total, pickup_date,
        pickup_window_snapshot, pickup_location_snapshot,
        order_items (
          variant_name_snapshot, quantity,
          order_item_coatings (coating_name_snapshot, piece_count),
          order_item_addons (addon_name_snapshot, quantity)
        )
      `)
      .eq("id", delivery.order_id)
      .maybeSingle();
    if (error || !data) throw new Error("The notification order snapshot is unavailable.");

    const order = data as unknown as OrderRow;
    const environment = getRequiredEmailEnvironment();
    const email = buildOrderConfirmationEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      total: Number(order.total),
      pickupDate: order.pickup_date,
      pickupWindow: order.pickup_window_snapshot,
      pickupLocation: order.pickup_location_snapshot,
      orderUrl: `${environment.siteUrl}/orders/${order.id}`,
      items: (order.order_items ?? []).map((item) => ({
        name: item.variant_name_snapshot,
        quantity: item.quantity,
        coatings: (item.order_item_coatings ?? []).map((coating) => `${coating.coating_name_snapshot} × ${coating.piece_count}`),
        addon: (item.order_item_addons ?? []).map((addon) => `${addon.addon_name_snapshot} × ${addon.quantity}`).join(", ") || null,
      })),
    });
    const providerMessageId = await sendWithResend({
      ...environment,
      to: delivery.recipient_email,
      idempotencyKey: delivery.idempotency_key,
      ...email,
    });
    const sentAt = new Date().toISOString();
    await supabase.from("notification_deliveries").update({
      status: "SENT",
      provider_message_id: providerMessageId,
      sent_at: sentAt,
      next_attempt_at: sentAt,
      last_error: null,
    }).eq("id", delivery.id).eq("status", "PROCESSING");
    return true;
  } catch (error) {
    const delayMinutes = Math.min(5 * (2 ** Math.max(nextAttempt - 1, 0)), 60);
    await supabase.from("notification_deliveries").update({
      status: "FAILED",
      last_error: error instanceof Error ? error.message.slice(0, 500) : "Transactional email failed.",
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    }).eq("id", delivery.id).eq("status", "PROCESSING");
    return false;
  }
}

export async function dispatchPendingNotifications(input: {
  orderId?: string;
  limit?: number;
} = {}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - PROCESSING_TIMEOUT_MS).toISOString();
  let query = supabase
    .from("notification_deliveries")
    .select("id, order_id, recipient_email, idempotency_key, event_type, status, attempt_count, last_attempt_at")
    .or(`and(status.in.(PENDING,FAILED),next_attempt_at.lte.${now.toISOString()}),and(status.eq.PROCESSING,last_attempt_at.lte.${staleBefore})`)
    .lt("attempt_count", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(input.limit ?? 20, 50)));
  if (input.orderId) query = query.eq("order_id", input.orderId);
  const { data, error } = await query;
  if (error) throw new Error("Pending transactional emails could not be loaded.", { cause: error });

  const deliveries = ((data ?? []) as DeliveryRow[]).filter((delivery) => canClaim(delivery, now.getTime()));
  let sent = 0;
  for (const delivery of deliveries) {
    if (await dispatchDelivery(delivery)) sent += 1;
  }
  return { examined: deliveries.length, sent, failed: deliveries.length - sent };
}

export async function dispatchOrderConfirmation(orderId: string) {
  return dispatchPendingNotifications({ orderId, limit: 1 });
}
