import { NextResponse } from "next/server";
import {
  parsePayMongoPaidEvent,
  verifyPayMongoTestWebhookSignature,
} from "@/lib/paymongo-webhook";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature")
    ?? request.headers.get("x-paymongo-signature");
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim() ?? "";

  if (!verifyPayMongoTestWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  let event;
  try {
    event = parsePayMongoPaidEvent(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payment event." }, { status: 400 });
  }
  if (!event) return NextResponse.json({ received: true, ignored: true });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("process_paymongo_paid_event", {
    event_key: event.eventKey,
    target_order_id: event.orderId,
    target_order_number: event.orderNumber,
    checkout_id: event.checkoutId,
    payment_id: event.paymentId,
    paid_amount: event.amountPhp,
    event_summary: event.summary,
  });
  if (error) {
    return NextResponse.json({ error: "Payment processing is temporarily unavailable." }, { status: 500 });
  }

  return NextResponse.json({ received: true, processed: Boolean(data) });
}
