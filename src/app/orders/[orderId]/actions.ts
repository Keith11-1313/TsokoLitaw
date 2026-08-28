"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { cancelCustomerOrder, submitManualRefundDestination } from "@/lib/server-refunds";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrderActionResult = { status: "idle" | "success" | "error"; message: string };

export async function cancelOrderAction(orderId: string, orderNumber: string): Promise<OrderActionResult> {
  const profile = await requireCustomer(`/orders/${orderId}`);
  if (!UUID_PATTERN.test(orderId) || !/^TL-[0-9]{4,}$/.test(orderNumber)) {
    return { status: "error", message: "That order could not be cancelled." };
  }
  try {
    await enforceMutationRateLimit({
      scope: "order-cancel",
      userId: profile.id,
      maximumRequests: 6,
      windowSeconds: 300,
    });
    const result = await cancelCustomerOrder(orderId, profile.id, orderNumber);
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { status: "success", message: result.message };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many cancellation attempts. Try again in about ${error.retryAfterSeconds} seconds.`
        : error instanceof Error ? error.message : "That order could not be cancelled.",
    };
  }
}

export async function manualRefundFallbackAction(input: {
  orderId: string;
  refundId: string;
  destinationType: "GCASH" | "MAYA" | "BANK";
  accountName: string;
  accountReference: string;
}): Promise<OrderActionResult> {
  const profile = await requireCustomer(`/orders/${input.orderId}`);
  if (!UUID_PATTERN.test(input.orderId) || !UUID_PATTERN.test(input.refundId)) {
    return { status: "error", message: "That refund request is unavailable." };
  }
  if (!["GCASH", "MAYA", "BANK"].includes(input.destinationType)) {
    return { status: "error", message: "Choose a valid refund destination." };
  }
  const accountName = input.accountName.trim();
  const accountReference = input.accountReference.trim();
  if (accountName.length < 2 || accountName.length > 100 || accountReference.length < 5 || accountReference.length > 100) {
    return { status: "error", message: "Enter a valid account name and account number." };
  }
  try {
    await enforceMutationRateLimit({
      scope: "refund-destination",
      userId: profile.id,
      maximumRequests: 4,
      windowSeconds: 600,
    });
    await submitManualRefundDestination({
      refundId: input.refundId,
      userId: profile.id,
      destinationType: input.destinationType,
      accountName,
      accountReference,
    });
    revalidatePath(`/orders/${input.orderId}`);
    return { status: "success", message: "Manual refund details submitted securely for Admin processing." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many refund-detail attempts. Try again in about ${error.retryAfterSeconds} seconds.`
        : "Manual refund details could not be saved. Please try again.",
    };
  }
}
