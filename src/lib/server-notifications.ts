import "server-only";

import {
  buildOrderCancelledEmail,
  buildOrderConfirmationEmail,
  buildReadyForPickupEmail,
  buildRefundCompletedEmail,
  buildRefundFailedEmail,
  buildRefundProcessingEmail,
} from "@/lib/notification-email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getConfiguredSiteOrigin } from "@/lib/site-url";

interface DeliveryRow {
  id: string;
  order_id: string;
  refund_id: string | null;
  recipient_email: string;
  idempotency_key: string;
  event_type: string;
  status: "PENDING" | "PROCESSING" | "SEND_FAILED" | "SENT" | "DELAYED"
    | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED" | "SUPPRESSED";
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
  refunds: Array<{
    id: string;
    amount: number | string;
    status: "REQUESTED" | "PROCESSING" | "REFUNDED" | "FAILED";
    created_at: string;
  }> | null;
}

const MAX_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

function getRequiredEmailEnvironment() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!apiKey || !from) {
    throw new Error("Transactional email environment is incomplete.");
  }
  return { apiKey, from, siteUrl: getConfiguredSiteOrigin() };
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
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!response.ok || typeof body?.id !== "string" || !body.id) {
    throw new Error(`Resend rejected the message with status ${response.status}.`);
  }
  return body.id;
}

async function reconcilePendingResendEvents(providerMessageId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notification_webhook_events")
    .select("provider_event_id, provider_message_id, event_type, event_created_at")
    .eq("provider", "resend")
    .eq("provider_message_id", providerMessageId)
    .is("processed_at", null)
    .order("event_created_at", { ascending: true })
    .limit(20);
  if (error) throw new Error("Pending Resend delivery events could not be loaded.", { cause: error });

  for (const event of data ?? []) {
    const result = await supabase.rpc("process_resend_delivery_event", {
      provider_event_id_value: event.provider_event_id,
      provider_message_id_value: event.provider_message_id,
      event_type_value: event.event_type,
      event_created_at_value: event.event_created_at,
    });
    if (result.error) {
      throw new Error("A pending Resend delivery event could not be reconciled.", { cause: result.error });
    }
  }
}

function canClaim(delivery: DeliveryRow, now: number) {
  if (delivery.attempt_count >= MAX_ATTEMPTS) return false;
  if (delivery.status === "PENDING" || delivery.status === "SEND_FAILED") return true;
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
    if (![
      "order.confirmed",
      "order.ready_for_pickup",
      "order.cancelled",
      "refund.processing",
      "refund.completed",
      "refund.failed",
    ].includes(delivery.event_type)) {
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
        ),
        refunds (id, amount, status, created_at)
      `)
      .eq("id", delivery.order_id)
      .maybeSingle();
    if (error || !data) throw new Error("The notification order snapshot is unavailable.");

    const order = data as unknown as OrderRow;
    const environment = getRequiredEmailEnvironment();
    const emailInput = {
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
    };
    const orderUrl = emailInput.orderUrl;
    const refund = delivery.refund_id
      ? (order.refunds ?? []).find((candidate) => candidate.id === delivery.refund_id) ?? null
      : [...(order.refunds ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    const refundInput = refund ? {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      orderUrl,
      refundAmount: Number(refund.amount),
    } : null;
    let email;
    switch (delivery.event_type) {
      case "order.ready_for_pickup":
        email = buildReadyForPickupEmail(emailInput);
        break;
      case "order.cancelled":
        email = buildOrderCancelledEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          orderUrl,
          refundAmount: refund ? Number(refund.amount) : null,
        });
        break;
      case "refund.processing":
        if (!refundInput) throw new Error("The processing refund snapshot is unavailable.");
        email = buildRefundProcessingEmail(refundInput);
        break;
      case "refund.completed":
        if (!refundInput) throw new Error("The completed refund snapshot is unavailable.");
        email = buildRefundCompletedEmail(refundInput);
        break;
      case "refund.failed":
        if (!refundInput) throw new Error("The failed refund snapshot is unavailable.");
        email = buildRefundFailedEmail(refundInput);
        break;
      default:
        email = buildOrderConfirmationEmail(emailInput);
    }
    const providerMessageId = await sendWithResend({
      ...environment,
      to: delivery.recipient_email,
      idempotencyKey: delivery.idempotency_key,
      ...email,
    });
    const sentAt = new Date().toISOString();
    const sentUpdate = await supabase.from("notification_deliveries").update({
      status: "SENT",
      provider_message_id: providerMessageId,
      sent_at: sentAt,
      next_attempt_at: sentAt,
      last_error: null,
    }).eq("id", delivery.id).eq("status", "PROCESSING");
    if (sentUpdate.error) throw new Error("The sent notification could not be recorded.", { cause: sentUpdate.error });
    try {
      await reconcilePendingResendEvents(providerMessageId);
    } catch (reconciliationError) {
      console.error("[resend-webhook] Pending delivery reconciliation failed", {
        deliveryId: delivery.id,
        errorType: reconciliationError instanceof Error ? reconciliationError.name : "UnknownError",
      });
    }
    return true;
  } catch (error) {
    const delayMinutes = Math.min(5 * (2 ** Math.max(nextAttempt - 1, 0)), 60);
    await supabase.from("notification_deliveries").update({
      status: "SEND_FAILED",
      last_error: error instanceof Error ? error.message.slice(0, 500) : "Transactional email failed.",
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    }).eq("id", delivery.id).eq("status", "PROCESSING");
    return false;
  }
}

export async function dispatchPendingNotifications(input: {
  orderId?: string;
  eventType?: string;
  limit?: number;
} = {}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - PROCESSING_TIMEOUT_MS).toISOString();
  let query = supabase
    .from("notification_deliveries")
    .select("id, order_id, refund_id, recipient_email, idempotency_key, event_type, status, attempt_count, last_attempt_at")
    .or(`and(status.in.(PENDING,SEND_FAILED),next_attempt_at.lte.${now.toISOString()}),and(status.eq.PROCESSING,last_attempt_at.lte.${staleBefore})`)
    .lt("attempt_count", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(input.limit ?? 20, 50)));
  if (input.orderId) query = query.eq("order_id", input.orderId);
  if (input.eventType) query = query.eq("event_type", input.eventType);
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
  return dispatchPendingNotifications({ orderId, eventType: "order.confirmed", limit: 1 });
}

export async function dispatchReadyForPickup(orderId: string) {
  return dispatchPendingNotifications({ orderId, eventType: "order.ready_for_pickup", limit: 1 });
}

export async function dispatchOrderNotifications(orderId: string) {
  return dispatchPendingNotifications({ orderId, limit: 10 });
}
