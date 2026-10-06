import type { OrderStatus } from "@/components/ui/status-badge";
import type { PaymentMethod, PaymentStatus } from "@/lib/payment-status";

// Presentation only. The cancellation RPC rechecks this under order/payment locks.
export function canAdminCancelOrder(order: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
}) {
  return (
    order.paymentStatus === "PENDING" &&
    (order.status === "PENDING_PAYMENT" ||
      (order.paymentMethod === "pay_at_counter" &&
        ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status)))
  );
}

export const fulfillmentTransitions = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "COMPLETED",
} as const satisfies Partial<Record<OrderStatus, OrderStatus>>;

export type FulfillmentStatus = keyof typeof fulfillmentTransitions;
export type NextFulfillmentStatus = (typeof fulfillmentTransitions)[FulfillmentStatus];

export function getNextFulfillmentStatus(status: OrderStatus): NextFulfillmentStatus | null {
  return status in fulfillmentTransitions
    ? fulfillmentTransitions[status as FulfillmentStatus]
    : null;
}

export function isAllowedFulfillmentTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return getNextFulfillmentStatus(currentStatus) === nextStatus;
}

export const fulfillmentActionLabels: Record<NextFulfillmentStatus, string> = {
  PREPARING: "Start preparing",
  READY_FOR_PICKUP: "Mark ready",
  COMPLETED: "Complete order",
};
