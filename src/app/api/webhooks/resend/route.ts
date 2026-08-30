import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { parseResendDeliveryEvent } from "@/lib/resend-webhook";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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
  const webhookId = request.headers.get("svix-id");
  const webhookTimestamp = request.headers.get("svix-timestamp");
  const webhookSignature = request.headers.get("svix-signature");
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";

  if (!secret || !webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let verifiedPayload: unknown;
  try {
    verifiedPayload = new Webhook(secret).verify(rawBody, {
      "svix-id": webhookId,
      "svix-timestamp": webhookTimestamp,
      "svix-signature": webhookSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let deliveryEvent;
  try {
    deliveryEvent = parseResendDeliveryEvent(verifiedPayload);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (!deliveryEvent) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("process_resend_delivery_event", {
    provider_event_id_value: webhookId,
    provider_message_id_value: deliveryEvent.providerMessageId,
    event_type_value: deliveryEvent.eventType,
    event_created_at_value: deliveryEvent.createdAt,
  });

  if (error) {
    return NextResponse.json(
      { error: "Delivery tracking is temporarily unavailable." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, processed: Boolean(data) });
}
