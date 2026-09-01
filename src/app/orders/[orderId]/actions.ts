"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { cancelCustomerOrder } from "@/lib/server-refunds";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrderActionResult = { status: "idle" | "success" | "error"; message: string; fieldErrors?: Record<string, string> };

export async function cancelOrderAction(orderId: string): Promise<OrderActionResult> {
  const profile = await requireCustomer(`/orders/${orderId}`);
  if (!UUID_PATTERN.test(orderId)) {
    return { status: "error", message: "That order could not be cancelled." };
  }
  try {
    await enforceMutationRateLimit({
      scope: "order-cancel",
      userId: profile.id,
      maximumRequests: 6,
      windowSeconds: 300,
    });
    const result = await cancelCustomerOrder(orderId, profile.id);
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
