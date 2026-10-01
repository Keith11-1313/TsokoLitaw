import type { OrderStatus } from "@/components/ui/status-badge";

export type PaymentStatus = "PENDING" | "UNDER_REVIEW" | "PAID" | "FAILED";
export type PaymentMethod = "paymongo" | "manual_gcash" | "pay_at_counter";

export function getPaymentStatusLabel(
  status: PaymentStatus,
  method?: PaymentMethod,
  paymentWindowOpen = true,
) {
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "PAID") return "Paid";
  if (status === "FAILED") return "Not paid";
  if (!paymentWindowOpen) return "Time ended";
  if (method === "manual_gcash") return "Awaiting receipt";
  if (method === "pay_at_counter") return "Pay at pickup";
  return "Pending";
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
