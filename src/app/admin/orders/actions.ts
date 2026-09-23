"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { isAllowedFulfillmentTransition } from "@/lib/order-status";
import { recordAdminCounterPayment, transitionAdminOrderStatus } from "@/lib/server-orders";
import { dispatchReadyForPickup } from "@/lib/server-notifications";
import { dispatchOrderConfirmation } from "@/lib/server-notifications";
import { getManualPayment } from "@/lib/server-manual-payment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceMutationRateLimit, MutationRateLimitError } from "@/lib/server-rate-limit";

export type AdminOrderActionResult = {
  status: "success" | "error";
  message: string;
};

export async function loadManualPaymentAction(orderId: string) {
  await requireAdmin("/admin/orders");
  if (!isUuid(orderId)) throw new Error("Invalid order.");
  const payment = await getManualPayment(orderId);
  const proof = payment?.submissions.find((submission) => submission.status === "UNDER_REVIEW");
  if (!payment || !proof) return payment ? { ...payment, approvedReferenceConflict: null } : null;

  const client = createAdminSupabaseClient();
  const { data: approvedProof, error: proofError } = await client
    .from("manual_payment_submissions")
    .select("order_id")
    .eq("reported_reference", proof.reported_reference)
    .eq("status", "APPROVED")
    .neq("order_id", orderId)
    .limit(1)
    .maybeSingle();
  if (proofError) throw new Error("Payment reference could not be checked.");

  let approvedReferenceConflict: { orderId: string; orderNumber: string } | null = null;
  if (approvedProof) {
    const { data: approvedOrder, error: orderError } = await client
      .from("orders")
      .select("order_number")
      .eq("id", approvedProof.order_id)
      .single();
    if (orderError) throw new Error("Approved payment order could not be loaded.");
    approvedReferenceConflict = {
      orderId: approvedProof.order_id,
      orderNumber: approvedOrder.order_number,
    };
  }

  return { ...payment, approvedReferenceConflict };
}

export async function reviewManualPaymentAction(input: {
  submissionId: string;
  approve: boolean;
  reason: string;
  verified: boolean;
}): Promise<AdminOrderActionResult> {
  const admin = await requireAdmin("/admin/orders");
  if (
    !isUuid(input.submissionId) ||
    typeof input.approve !== "boolean" ||
    !input.verified ||
    typeof input.reason !== "string" ||
    input.reason.length > 500 ||
    (!input.approve && input.reason.trim().length < 3)
  ) {
    return {
      status: "error",
      message:
        "Confirm that you checked the actual incoming transaction. Rejection requires a reason.",
    };
  }
  try {
    await enforceMutationRateLimit({
      scope: "manual-review",
      userId: admin.id,
      maximumRequests: 30,
      windowSeconds: 300,
    });
    const client = createAdminSupabaseClient();
    const { data: proof, error: readError } = await client
      .from("manual_payment_submissions")
      .select("order_id, reported_reference")
      .eq("id", input.submissionId)
      .maybeSingle();
    if (readError || !proof) return { status: "error", message: "Receipt unavailable." };
    if (input.approve) {
      const { data: approvedProof, error: duplicateReadError } = await client
        .from("manual_payment_submissions")
        .select("id")
        .eq("reported_reference", proof.reported_reference)
        .eq("status", "APPROVED")
        .neq("id", input.submissionId)
        .limit(1)
        .maybeSingle();
      if (duplicateReadError)
        return {
          status: "error",
          message: "Payment reference could not be checked. Refresh before trying again.",
        };
      if (approvedProof)
        return {
          status: "error",
          message: "This reference has already been approved for another order.",
        };
    }
    const { error } = await client.rpc("review_manual_payment", {
      target_admin_id: admin.id,
      target_submission_id: input.submissionId,
      approve: input.approve,
      reason_value: input.reason.trim(),
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "This reference has already been approved for another order."
            : "Review could not be saved. Refresh and check the current status and amount before trying again.",
      };
    if (input.approve) {
      try {
        await dispatchOrderConfirmation(proof.order_id);
      } catch {
        /* Durable email queue retries independently. */
      }
    }
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/orders");
    revalidatePath(`/orders/${proof.order_id}`);
    revalidatePath(`/orders/${proof.order_id}/payment`);
    return {
      status: "success",
      message: input.approve
        ? "Payment verified and order confirmed."
        : "Receipt rejected with your reason. Customer can resubmit within 15 minutes.",
    };
  } catch {
    return {
      status: "error",
      message: "Review is temporarily unavailable. Refresh before trying again.",
    };
  }
}

export async function transitionOrderStatusAction(input: {
  orderId: string;
  expectedStatus: OrderStatus;
  nextStatus: OrderStatus;
}): Promise<AdminOrderActionResult> {
  const admin = await requireAdmin("/admin/orders");

  if (
    !isUuid(input.orderId) ||
    !isAllowedFulfillmentTransition(input.expectedStatus, input.nextStatus)
  ) {
    return { status: "error", message: "That fulfillment update is invalid." };
  }

  try {
    await enforceMutationRateLimit({
      scope: "admin-order-status",
      userId: admin.id,
      maximumRequests: 30,
      windowSeconds: 300,
    });
    await transitionAdminOrderStatus({
      adminId: admin.id,
      ...input,
    });
    if (input.nextStatus === "READY_FOR_PICKUP") {
      try {
        await dispatchReadyForPickup(input.orderId);
      } catch (notificationError) {
        console.error("[ready-for-pickup] Immediate dispatch failed", {
          errorType: notificationError instanceof Error ? notificationError.name : "UnknownError",
        });
      }
    }
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/orders");
    revalidatePath(`/orders/${input.orderId}`);
    return { status: "success", message: "Order status updated." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MutationRateLimitError
          ? `Too many updates. Try again in about ${error.retryAfterSeconds} seconds.`
          : error instanceof Error
            ? error.message
            : "The order status could not be updated.",
    };
  }
}

export async function recordCounterPaymentAction(orderId: string): Promise<AdminOrderActionResult> {
  const admin = await requireAdmin("/admin/orders");
  if (!isUuid(orderId)) return { status: "error", message: "That order is invalid." };

  try {
    await enforceMutationRateLimit({
      scope: "counter-payment",
      userId: admin.id,
      maximumRequests: 30,
      windowSeconds: 300,
    });
    await recordAdminCounterPayment({ adminId: admin.id, orderId });
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { status: "success", message: "Counter payment recorded." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MutationRateLimitError
          ? `Too many updates. Try again in about ${error.retryAfterSeconds} seconds.`
          : error instanceof Error
            ? error.message
            : "The counter payment could not be recorded.",
    };
  }
}
