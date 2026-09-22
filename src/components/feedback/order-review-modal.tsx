"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { OrderReviewForm } from "@/components/feedback/order-review-form";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import type { ReviewOrderItemSummary } from "@/lib/reviews";

interface OrderReviewModalProps {
  orderId: string;
  orderNumber: string;
  itemSummary: ReviewOrderItemSummary[];
  existingReview: null | {
    id: string;
    rating: number;
    comment: string;
    highlights: string[];
    imageCount: number;
    createdAt: string;
  };
}

export function OrderReviewModal(props: OrderReviewModalProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(props.existingReview));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handleSubmitted = useCallback(() => setSubmitted(true), []);

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
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="font-display text-2xl">
        {submitted ? "Review submitted" : "Share your experience"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {submitted
          ? "You already reviewed this order. You can view your submitted review below."
          : "Each completed order can receive one customer review."}
      </p>
      <button
        ref={triggerRef}
        type="button"
        className={`${submitted ? secondaryButtonClassName : primaryButtonClassName} mt-5 w-full`}
        onClick={() => setOpen(true)}
      >
        {submitted ? "View my review" : "Review this order"}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4"
          onPointerDown={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-review-title"
            onPointerDown={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-2xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="order-review-title" className="font-display text-3xl">
                {submitted ? "My review" : "Review"} {props.orderNumber}
              </h2>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close review dialog"
                onClick={() => setOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>
            <div className="mt-6">
              <OrderReviewForm {...props} onSubmitted={handleSubmitted} />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
