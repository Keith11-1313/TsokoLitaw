import { cn } from "@/lib/cn";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

const statusStyles: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-warning-background text-warning-foreground",
  PAID: "bg-info-background text-info-foreground",
  CONFIRMED: "bg-info-background text-info-foreground",
  PREPARING: "bg-info-background text-info-foreground",
  READY_FOR_PICKUP: "bg-success-background text-success-foreground",
  COMPLETED: "bg-success-background text-success-foreground",
  CANCELLED: "bg-danger-background text-danger-foreground",
  EXPIRED: "bg-surface-muted text-muted-foreground",
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-lg px-2.5 py-1 text-xs font-bold leading-none",
        statusStyles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
