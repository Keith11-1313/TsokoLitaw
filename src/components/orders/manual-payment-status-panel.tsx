import type { ReactNode } from "react";
import Link from "next/link";

export type ManualPaymentPageState = "under_review" | "paid" | "cancelled" | "expired";

const copy: Record<ManualPaymentPageState, { title: string; description: string }> = {
  under_review: {
    title: "Payment under review",
    description:
      "We received your receipt. Our team will check it against the incoming GCash transaction. Your order is still reserved, so please do not pay again.",
  },
  paid: {
    title: "Payment verified",
    description: "We verified your payment and confirmed your order.",
  },
  cancelled: {
    title: "Order cancelled",
    description: "You cancelled this order before paying, so we released the reserved items.",
  },
  expired: {
    title: "Payment time ended",
    description:
      "We did not receive a valid receipt before time ran out, so we released the reserved items.",
  },
};

export function ManualPaymentStatusPanel({
  state,
  orderId,
  orderNumber,
  children,
}: {
  state: ManualPaymentPageState;
  orderId: string;
  orderNumber: string;
  children?: ReactNode;
}) {
  const content = copy[state];
  return (
    <section className="mt-7 max-w-3xl rounded-card border border-border bg-surface p-5 sm:p-8">
      <h2 className="font-display text-2xl">{content.title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{content.description}</p>

      {children ? <div className="mt-6 space-y-5">{children}</div> : null}

      {state === "expired" ? (
        <p className="mt-4 text-sm leading-6">
          If you already sent the payment,{" "}
          <a
            href={`mailto:tsokolitaw@gmail.com?subject=${encodeURIComponent(`Payment concern ${orderNumber}`)}`}
            className="font-bold text-brand underline"
          >
            Contact TsokoLitaw
          </a>{" "}
          and include {orderNumber}. Please do not send another payment.
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-5 text-sm font-bold text-brand"
        >
          Back to order
        </Link>
        {state === "expired" ? (
          <Link
            href="/checkout"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-surface"
          >
            Return to checkout
          </Link>
        ) : null}
      </div>
    </section>
  );
}
