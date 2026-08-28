import "server-only";

import { createPayMongoRefund, expirePayMongoCheckoutSession, PayMongoApiError } from "@/lib/paymongo";
import { encryptRefundDestination } from "@/lib/refund-encryption";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface CancellationPreparation {
  cancellation_kind: "UNPAID" | "PAID_REFUND";
  cancellation_payment_id: string | null;
  cancellation_checkout_id: string | null;
  cancellation_provider_payment_id: string | null;
  cancellation_amount: number | string;
  existing_refund_id: string | null;
  existing_refund_status: "REQUESTED" | "PROCESSING" | "REFUNDED" | "FAILED" | null;
}

interface RequestedRefund {
  requested_refund_id: string;
  requested_payment_id: string;
  provider_payment_id: string;
  refund_amount: number | string;
  refund_status_value: "REQUESTED" | "PROCESSING" | "REFUNDED" | "FAILED";
}

function firstRow<T>(data: unknown) {
  return (Array.isArray(data) ? data[0] : data) as T | null;
}

export async function cancelCustomerOrder(orderId: string, userId: string, orderNumber: string) {
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

  if (preparation.cancellation_kind === "UNPAID") {
    if (preparation.cancellation_checkout_id) {
      await expirePayMongoCheckoutSession(preparation.cancellation_checkout_id);
    }
    const result = await supabase.rpc("cancel_unpaid_order", {
      target_order_id: orderId,
      target_user_id: userId,
      expired_checkout_id: preparation.cancellation_checkout_id,
    });
    if (result.error) throw new Error("The unpaid order could not be cancelled.", { cause: result.error });
    return { message: "Order cancelled. No payment was collected.", refundStatus: null };
  }

  const requestResult = await supabase.rpc("request_paid_order_refund", {
    target_order_id: orderId,
    target_user_id: userId,
  });
  if (requestResult.error) throw new Error("The refund request could not be created.", { cause: requestResult.error });
  const requested = firstRow<RequestedRefund>(requestResult.data);
  if (!requested) throw new Error("The refund request is unavailable.");
  if (requested.refund_status_value !== "REQUESTED") {
    return { message: "This cancellation was already submitted.", refundStatus: requested.refund_status_value };
  }

  let refund;
  try {
    refund = await createPayMongoRefund({
      refundId: requested.requested_refund_id,
      paymentId: requested.provider_payment_id,
      amountPhp: Number(requested.refund_amount),
      orderNumber,
    });
  } catch (error) {
    const failureCode = error instanceof PayMongoApiError ? error.code ?? `http_${error.status}` : "provider_error";
    const failureMessage = error instanceof Error ? error.message : "PayMongo rejected the refund request.";
    await supabase.rpc("fail_paymongo_refund_request", {
      target_refund_id: requested.requested_refund_id,
      failure_code_value: failureCode,
      failure_message_value: failureMessage,
    });
    return {
      message: "Order cancelled, but PayMongo could not start the refund. Add a manual refund destination below.",
      refundStatus: "FAILED" as const,
    };
  }

  const recorded = await supabase.rpc("record_paymongo_refund_result", {
    target_refund_id: requested.requested_refund_id,
    provider_refund_id_value: refund.id,
    provider_status_value: refund.status,
    failure_code_value: refund.status === "failed" ? "provider_failed" : null,
    failure_message_value: refund.status === "failed" ? "PayMongo reported that the refund failed." : null,
  });
  if (recorded.error) {
    throw new Error("PayMongo accepted the refund, but its result could not be retained. Retry safely before taking another action.", { cause: recorded.error });
  }
  return {
    message: refund.status === "succeeded"
      ? "Order cancelled and the full refund was accepted by PayMongo."
      : refund.status === "failed"
        ? "Order cancelled, but the automatic refund failed. Add a manual refund destination below."
        : "Order cancelled. PayMongo is processing the full refund to the original payment method.",
    refundStatus: refund.status === "succeeded" ? "REFUNDED" : refund.status === "failed" ? "FAILED" : "PROCESSING",
  };
}

export async function submitManualRefundDestination(input: {
  refundId: string;
  userId: string;
  destinationType: "GCASH" | "MAYA" | "BANK";
  accountName: string;
  accountReference: string;
}) {
  const encryptedReference = encryptRefundDestination(input.accountReference);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("request_manual_refund_fallback", {
    target_refund_id: input.refundId,
    target_user_id: input.userId,
    destination_type_value: input.destinationType,
    account_name_value: input.accountName,
    encrypted_reference_value: encryptedReference,
  });
  if (error) throw new Error("Manual refund details could not be saved.", { cause: error });
}
