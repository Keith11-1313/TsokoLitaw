import "server-only";
import type { OrderStatus } from "@/components/ui/status-badge";

import { expirePayMongoCheckoutSession } from "@/lib/paymongo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchOrderNotifications } from "@/lib/server-notifications";

async function dispatchCancellationNotifications(orderId: string) {
  try {
    await dispatchOrderNotifications(orderId);
  } catch (error) {
    console.error("[cancellation-notifications] Immediate dispatch failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function cancelAdminOrder(input: {
  adminId: string;
  orderId: string;
  expectedStatus: OrderStatus;
  reason: string;
}) {
  const supabase = createAdminSupabaseClient();
  const args = {
    target_admin_id: input.adminId,
    target_order_id: input.orderId,
    expected_status: input.expectedStatus,
  };
  const preparationResult = await supabase.rpc("prepare_admin_order_cancellation", args);
  const preparation = preparationResult.data?.[0];
  if (preparationResult.error || !preparation) {
    throw new Error(
      "This order changed or is no longer eligible. Refresh and check its payment status.",
    );
  }
  if (preparation.already_cancelled) return;
  if (preparation.checkout_id) await expirePayMongoCheckoutSession(preparation.checkout_id);
  const result = await supabase.rpc("cancel_admin_unpaid_order", {
    ...args,
    reason_value: input.reason,
    expired_checkout_id: preparation.checkout_id,
  });
  if (result.error) {
    throw new Error("Cancellation was not saved. Refresh and check the order before trying again.");
  }
  await dispatchCancellationNotifications(input.orderId);
}

export async function cancelCustomerOrder(orderId: string, userId: string) {
  const supabase = createAdminSupabaseClient();
  const preparationResult = await supabase.rpc("prepare_order_cancellation", {
    target_order_id: orderId,
    target_user_id: userId,
  });
  if (preparationResult.error) {
    throw new Error("This order is no longer eligible for cancellation.", {
      cause: preparationResult.error,
    });
  }
  const preparation = preparationResult.data?.[0];
  if (!preparation) throw new Error("Cancellation details are unavailable.");
  if (preparation.cancellation_kind !== "UNPAID") {
    throw new Error("Please speak with TsokoLitaw in person about a paid order.");
  }
  if (preparation.cancellation_checkout_id) {
    await expirePayMongoCheckoutSession(preparation.cancellation_checkout_id);
  }
  const result = await supabase.rpc("cancel_unpaid_order", {
    target_order_id: orderId,
    target_user_id: userId,
    expired_checkout_id: preparation.cancellation_checkout_id,
  });
  if (result.error)
    throw new Error("The unpaid order could not be cancelled.", { cause: result.error });
  await dispatchCancellationNotifications(orderId);
  return { message: "Order cancelled. No payment was collected." };
}
