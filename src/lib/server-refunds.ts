import "server-only";

import { expirePayMongoCheckoutSession } from "@/lib/paymongo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchOrderNotifications } from "@/lib/server-notifications";

interface CancellationPreparation {
  cancellation_kind: string;
  cancellation_checkout_id: string | null;
}

function firstRow<T>(data: unknown) {
  return (Array.isArray(data) ? data[0] : data) as T | null;
}

async function dispatchCancellationNotifications(orderId: string) {
  try {
    await dispatchOrderNotifications(orderId);
  } catch (error) {
    console.error("[cancellation-notifications] Immediate dispatch failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function cancelCustomerOrder(orderId: string, userId: string) {
  const supabase = createAdminSupabaseClient();
  const preparationResult = await supabase.rpc("prepare_order_cancellation", {
    target_order_id: orderId,
    target_user_id: userId,
  });
  if (preparationResult.error) {
    throw new Error("This order is no longer eligible for cancellation.", { cause: preparationResult.error });
  }
  const preparation = firstRow<CancellationPreparation>(preparationResult.data);
  if (!preparation) throw new Error("Cancellation details are unavailable.");
  if (preparation.cancellation_kind !== "UNPAID") {
    throw new Error("Paid-order concerns must be settled directly with TsokoLitaw in person.");
  }
  if (preparation.cancellation_checkout_id) {
    await expirePayMongoCheckoutSession(preparation.cancellation_checkout_id);
  }
  const result = await supabase.rpc("cancel_unpaid_order", {
    target_order_id: orderId,
    target_user_id: userId,
    expired_checkout_id: preparation.cancellation_checkout_id,
  });
  if (result.error) throw new Error("The unpaid order could not be cancelled.", { cause: result.error });
  await dispatchCancellationNotifications(orderId);
  return { message: "Order cancelled. No payment was collected." };
}
