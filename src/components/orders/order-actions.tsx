"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelOrderAction, type OrderActionResult } from "@/app/orders/[orderId]/actions";

const initialResult: OrderActionResult = { status: "idle", message: "" };

export function OrderActions({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(initialResult);
  const [isPending, startTransition] = useTransition();

  function confirmCancellation() {
    startTransition(async () => {
      const next = await cancelOrderAction(orderId);
      setResult(next);
      if (next.status === "success") {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-danger-foreground px-5 text-sm font-bold text-danger-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-auto">Cancel unpaid order</button>
      {result.message ? <p role="status" className={result.status === "error" ? "text-sm text-danger-foreground" : "text-sm text-success-foreground"}>{result.message}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4" onPointerDown={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" onPointerDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <h2 id="cancel-order-title" className="font-display text-3xl">Cancel {orderNumber}?</h2>
              <button type="button" aria-label="Close cancellation dialog" onClick={() => setOpen(false)} className="flex size-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" size={20} /></button>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">The unpaid order and any reserved prepared pieces will be released. No payment was collected.</p>
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
