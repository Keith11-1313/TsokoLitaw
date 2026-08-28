"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { isAllowedFulfillmentTransition } from "@/lib/order-status";
import { transitionAdminOrderStatus } from "@/lib/server-orders";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";

export type AdminOrderActionResult = {
  status: "success" | "error";
  message: string;
};

export async function transitionOrderStatusAction(input: {
  orderId: string;
  expectedStatus: OrderStatus;
  nextStatus: OrderStatus;
}): Promise<AdminOrderActionResult> {
  const admin = await requireAdmin("/admin/orders");

  if (!isUuid(input.orderId)
    || !isAllowedFulfillmentTransition(input.expectedStatus, input.nextStatus)) {
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
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/orders");
    revalidatePath(`/orders/${input.orderId}`);
    return { status: "success", message: "Order status updated." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many updates. Try again in about ${error.retryAfterSeconds} seconds.`
        : error instanceof Error ? error.message : "The order status could not be updated.",
    };
  }
}
