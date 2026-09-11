"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { enforceMutationRateLimit } from "@/lib/server-rate-limit";
import { validateUploadedImage } from "@/lib/server-image-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function submitManualReceipt(orderId: string, form: FormData) {
  const profile = await requireCustomer(`/orders/${orderId}/payment`);
  if (!isUuid(orderId)) return { status: "error", message: "Invalid order." };
  try {
    await enforceMutationRateLimit({
      scope: "manual-receipt",
      userId: profile.id,
      maximumRequests: 5,
      windowSeconds: 300,
    });
    const client = createAdminSupabaseClient();
    const { data: order, error } = await client
      .from("orders")
      .select("id, payment_expires_at, payment_status, status, payment_method")
      .eq("id", orderId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (
      error ||
      !order ||
      order.payment_method !== "manual_gcash" ||
      order.status !== "PENDING_PAYMENT" ||
      order.payment_status !== "PENDING" ||
      !order.payment_expires_at ||
      Date.parse(order.payment_expires_at) <= Date.now()
    ) {
      return {
        status: "error",
        message:
          "This order is no longer accepting receipts. Refresh to see its current status. If you already paid, contact TsokoLitaw; do not pay again.",
      };
    }
    const reference = String(form.get("reference") ?? "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    const amountText = String(form.get("amount") ?? "");
    const recipient = String(form.get("recipient") ?? "").trim();
    const paidAtText = String(form.get("paidAt") ?? "");
    const paidAt = new Date(`${paidAtText}+08:00`);
    if (
      !/^[A-Z0-9]{6,64}$/.test(reference) ||
      !/^\d{1,8}(\.\d{1,2})?$/.test(amountText) ||
      Number(amountText) <= 0 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(paidAtText) ||
      Number.isNaN(paidAt.getTime()) ||
      recipient.length < 2 ||
      recipient.length > 100 ||
      form.get("confirmed") !== "on"
    ) {
      return {
        status: "error",
        message: "Review the reference, amount, date/time and recipient, then confirm the details.",
      };
    }
    const file = form.get("receipt");
    if (!(file instanceof File))
      return { status: "error", message: "Upload your completed payment receipt." };
    const validated = await validateUploadedImage(file, { label: "receipt" });
    const submissionId = randomUUID();
    const path = `${profile.id}/${orderId}/${submissionId}.${validated.extension}`;
    const { error: uploadError } = await client.storage
      .from("payment-receipts")
      .upload(path, validated.buffer, { contentType: validated.contentType, upsert: false });
    if (uploadError)
      return { status: "error", message: "Receipt upload failed. Please try again." };
    const { error: submitError } = await client.rpc("submit_manual_payment", {
      target_user_id: profile.id,
      target_order_id: orderId,
      submission_id: submissionId,
      receipt_path_value: path,
      reported_reference_value: reference,
      reported_amount_value: Number(amountText),
      reported_paid_at_value: paidAt.toISOString(),
      reported_recipient_value: recipient,
    });
    if (submitError) {
      // Known SQL failures rolled back. Only remove this attempt's upload, never existing receipts.
      if (["P0001", "23505", "23514", "22008"].includes(submitError.code)) {
        await client.storage.from("payment-receipts").remove([path]);
      }
      // Unknown/network failures may have committed: keep their evidence for reconciliation.
      return {
        status: "error",
        message:
          "We could not confirm submission. Refresh the order before trying again. Do not send another payment.",
      };
    }
    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}/payment`);
    revalidatePath("/orders");
    revalidatePath("/admin/orders");
    return { status: "success", message: "Receipt submitted for review. Do not pay again." };
  } catch {
    return {
      status: "error",
      message:
        "Receipt could not be submitted. Use a valid JPG, PNG or WebP up to 3 MB, or try again shortly. Do not pay again.",
    };
  }
}
