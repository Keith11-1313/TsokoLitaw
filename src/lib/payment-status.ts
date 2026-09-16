import type { OrderStatus } from "@/components/ui/status-badge";

export type PaymentStatus = "PENDING" | "UNDER_REVIEW" | "PAID" | "FAILED";
export type PaymentMethod = "paymongo" | "manual_gcash";

export function getPaymentStatusLabel(
  status: PaymentStatus,
  method?: PaymentMethod,
  paymentWindowOpen = true,
) {
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "PAID") return "Paid";
  if (status === "FAILED") return "Not paid";
  if (!paymentWindowOpen) return "Time ended";
  return method === "manual_gcash" ? "Awaiting receipt" : "Pending";
}

export function getOrderStatusLabelOverride({
  status,
  paymentStatus,
  paymentWindowOpen,
}: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentWindowOpen: boolean;
}) {
  if (paymentStatus === "UNDER_REVIEW") return "Payment under review";
  if (status === "PENDING_PAYMENT" && !paymentWindowOpen) return "Payment time ended";
  if (status === "PAID" || status === "CONFIRMED") return "Received";
  return undefined;
}
