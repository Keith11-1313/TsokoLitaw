"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { OrderReviewForm } from "@/components/feedback/order-review-form";
import { primaryButtonClassName } from "@/components/ui/button";

interface OrderReviewModalProps {
  orderId: string;
  orderNumber: string;
  itemSummary: string;
  existingReview: null | {
    rating: number;
    comment: string;
    createdAt: string;
  };
}

export function OrderReviewModal(props: OrderReviewModalProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className={`${primaryButtonClassName} mt-5`} onClick={() => setOpen(true)}>
        {props.existingReview ? "View your review" : "Review this order"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={() => setOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-review-title"
            onPointerDown={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-2xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Completed order</p>
                <h2 id="order-review-title" className="mt-1 font-display text-3xl">Review {props.orderNumber}</h2>
              </div>
              <button ref={closeRef} type="button" aria-label="Close review dialog" onClick={() => setOpen(false)} className="flex size-11 shrink-0 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                <X aria-hidden="true" size={22} />
              </button>
            </div>
            <div className="mt-6"><OrderReviewForm {...props} /></div>
          </section>
        </div>
      ) : null}
    </>
  );
}
