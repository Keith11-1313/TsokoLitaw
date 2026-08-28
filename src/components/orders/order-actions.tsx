"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  cancelOrderAction,
  manualRefundFallbackAction,
  type OrderActionResult,
} from "@/app/orders/[orderId]/actions";

const initialResult: OrderActionResult = { status: "idle", message: "" };

export function OrderActions({
  orderId,
  orderNumber,
  paymentStatus,
  refund,
  allowCancellation = true,
}: {
  orderId: string;
  orderNumber: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  refund: null | { id: string; status: "REQUESTED" | "PROCESSING" | "REFUNDED" | "FAILED"; method: "ORIGINAL_PAYMENT_METHOD" | "MANUAL_FALLBACK" };
  allowCancellation?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(initialResult);
  const [isPending, startTransition] = useTransition();
  const [fallbackResult, setFallbackResult] = useState(initialResult);

  function confirmCancellation() {
    startTransition(async () => {
      const next = await cancelOrderAction(orderId, orderNumber);
      setResult(next);
      if (next.status === "success") {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function submitFallback(formData: FormData) {
    startTransition(async () => {
      const next = await manualRefundFallbackAction({
        orderId,
        refundId: refund!.id,
        destinationType: String(formData.get("destinationType")) as "GCASH" | "MAYA" | "BANK",
        accountName: String(formData.get("accountName") ?? ""),
        accountReference: String(formData.get("accountReference") ?? ""),
      });
      setFallbackResult(next);
      if (next.status === "success") router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {allowCancellation ? <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-danger-foreground px-5 text-sm font-bold text-danger-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-auto">Cancel order</button> : null}
      {result.message ? <p role="status" className={result.status === "error" ? "text-sm text-danger-foreground" : "text-sm text-success-foreground"}>{result.message}</p> : null}

      {refund?.status === "FAILED" && refund.method === "ORIGINAL_PAYMENT_METHOD" ? (
        <form action={submitFallback} className="rounded-card border border-warning-foreground/30 bg-warning-background p-5">
          <h3 className="font-display text-xl">Manual refund fallback</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">PayMongo could not return the payment automatically. Provide the account where Admin should send the full refund. These details are encrypted and restricted.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Destination
              <select name="destinationType" className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface-muted px-4 font-normal" defaultValue="GCASH">
                <option value="GCASH">GCash</option><option value="MAYA">Maya</option><option value="BANK">Bank account</option>
              </select>
            </label>
            <label className="text-sm font-bold">Account name
              <input name="accountName" required minLength={2} maxLength={100} className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface-muted px-4 font-normal" />
            </label>
            <label className="text-sm font-bold sm:col-span-2">Mobile or account number
              <input name="accountReference" required minLength={5} maxLength={100} inputMode="numeric" autoComplete="off" className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface-muted px-4 font-normal" />
            </label>
          </div>
          <button disabled={isPending} className="mt-5 min-h-11 w-full rounded-full bg-brand px-5 text-sm font-bold text-surface disabled:opacity-60">{isPending ? "Submitting…" : "Submit refund details"}</button>
          {fallbackResult.message ? <p role="status" className={fallbackResult.status === "error" ? "mt-3 text-sm text-danger-foreground" : "mt-3 text-sm text-success-foreground"}>{fallbackResult.message}</p> : null}
        </form>
      ) : null}

      {open && allowCancellation ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4" onPointerDown={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" onPointerDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <h2 id="cancel-order-title" className="font-display text-3xl">Cancel {orderNumber}?</h2>
              <button type="button" aria-label="Close cancellation dialog" onClick={() => setOpen(false)} className="flex size-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" size={20} /></button>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{paymentStatus === "PAID" ? "The order will be cancelled immediately and a full refund will be requested through PayMongo to the original payment method. Refund completion may take time." : "The unpaid order and its reserved pickup capacity will be released. No refund is needed because no payment was collected."}</p>
            {result.status === "error" ? <p role="alert" className="mt-4 rounded-control bg-danger-background p-4 text-sm text-danger-foreground">{result.message}</p> : null}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full border border-brand px-4 text-sm font-bold text-brand">Keep order</button>
              <button type="button" onClick={confirmCancellation} disabled={isPending} className="min-h-11 rounded-full bg-danger-foreground px-4 text-sm font-bold text-surface disabled:opacity-60">{isPending ? "Cancelling…" : "Cancel order"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
