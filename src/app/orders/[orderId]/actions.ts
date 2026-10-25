"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { cancelCustomerOrder } from "@/lib/server-cancellation";
import { enforceMutationRateLimit, MutationRateLimitError } from "@/lib/server-rate-limit";

import { isEntityId } from "@/lib/identifiers";

export type OrderActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function cancelOrderAction(orderId: string): Promise<OrderActionResult> {
  const profile = await requireCustomer(`/orders/${orderId}`);
  if (!isEntityId(orderId)) {
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
      message:
        error instanceof MutationRateLimitError
          ? `Too many cancellation attempts. Try again in about ${error.retryAfterSeconds} seconds.`
          : error instanceof Error
            ? error.message
            : "That order could not be cancelled.",
    };
  }
}
