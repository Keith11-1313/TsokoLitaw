import { NextResponse } from "next/server";
import { parsePayMongoPaidEvent, verifyPayMongoWebhookSignature } from "@/lib/paymongo-webhook";
import { getPayMongoMode } from "@/lib/paymongo-mode";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchOrderConfirmation } from "@/lib/server-notifications";
import { readWebhookBody, WebhookBodyTooLargeError } from "@/lib/webhook-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await readWebhookBody(request);
  } catch (error) {
    if (error instanceof WebhookBodyTooLargeError) {
      return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
    }
    throw error;
  }
  const signature =
    request.headers.get("paymongo-signature") ?? request.headers.get("x-paymongo-signature");
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim() ?? "";
  const mode = getPayMongoMode();

  if (!verifyPayMongoWebhookSignature(rawBody, signature, secret, mode)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  let paidEvent;
  try {
    paidEvent = parsePayMongoPaidEvent(payload, mode);
  } catch {
    return NextResponse.json({ error: "Invalid payment event." }, { status: 400 });
  }
  if (!paidEvent) {
    return NextResponse.json({ error: "Unsupported webhook payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // A PayMongo test account can send the same signed event to both the Dev and
  // Production webhook endpoints. Only the environment that created the
  // checkout/payment has a matching local row. Acknowledge the event in the
  // other environment so PayMongo does not retry it until the endpoint is
  // disabled; matching events still go through the strict RPC checks below.
  const localTarget = await supabase
    .from("payments")
    .select("id")
    .eq("provider", "paymongo")
    .eq("provider_checkout_id", paidEvent.checkoutId)
    .maybeSingle();

  if (localTarget.error) {
    return NextResponse.json(
      { error: "Payment processing is temporarily unavailable." },
      { status: 500 },
    );
  }
  if (!localTarget.data) {
    return NextResponse.json({ received: true, processed: false, ignored: "other_environment" });
  }

  const { data, error } = await supabase.rpc("process_paymongo_paid_event", {
    event_key: paidEvent.eventKey,
    target_order_id: paidEvent.orderId,
    target_order_number: paidEvent.orderNumber,
    checkout_id: paidEvent.checkoutId,
    payment_id: paidEvent.paymentId,
    paid_amount: paidEvent.amountPhp,
    event_summary: paidEvent.summary,
  });
  if (error) {
    return NextResponse.json(
      { error: "Payment processing is temporarily unavailable." },
      { status: 500 },
    );
  }

  if (paidEvent && data) {
    try {
      await dispatchOrderConfirmation(paidEvent.orderId);
    } catch (notificationError) {
      console.error("[order-confirmation] Immediate dispatch failed", {
        errorType: notificationError instanceof Error ? notificationError.name : "UnknownError",
      });
    }
  }

  return NextResponse.json({ received: true, processed: Boolean(data) });
}
