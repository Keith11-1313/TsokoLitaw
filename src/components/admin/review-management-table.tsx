"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { moderateReviewAction } from "@/app/admin/reviews/actions";
import type { AdminReviewSummary } from "@/lib/server-reviews";

function ReviewActions({ review }: { review: AdminReviewSummary }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function update(isVisible: boolean, isFeatured: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await moderateReviewAction({
        reviewId: review.id,
        isVisible,
        isFeatured,
      });
      setMessage(result.status === "error" ? result.message : null);
    });
  }

  return (
    <div className="min-w-44">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => update(!review.isVisible, false)}
          className="min-h-11 rounded-full border border-brand px-4 text-xs font-bold text-brand disabled:opacity-60"
        >
          {pending ? "Saving…" : review.isVisible ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => update(true, !review.isFeatured)}
          className="min-h-11 rounded-full bg-brand px-4 text-xs font-bold text-surface disabled:opacity-60"
        >
          {pending ? "Saving…" : review.isFeatured ? "Unfeature" : "Feature"}
        </button>
      </div>
      {message ? <p role="alert" className="mt-2 text-xs text-danger-foreground">{message}</p> : null}
    </div>
  );
}

export function ReviewManagementTable({ reviews }: { reviews: AdminReviewSummary[] }) {
  return (
    <section className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
      {reviews.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] border-collapse text-left text-sm">
            <thead>
              <tr className="h-12 bg-surface-muted text-xs text-foreground">
                <th className="rounded-l-control px-4 font-bold">Customer</th>
                <th className="px-4 font-bold">Order</th>
                <th className="px-4 font-bold">Rating</th>
                <th className="px-4 font-bold">Review</th>
                <th className="px-4 font-bold">Visibility</th>
                <th className="rounded-r-control px-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-border align-top last:border-b-0">
                  <td className="px-4 py-4 font-bold text-foreground">{review.customerName}</td>
                  <td className="px-4 py-4 text-foreground">{review.orderNumber}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 font-bold text-foreground">
                      <Star aria-hidden="true" className="fill-warning-foreground text-warning-foreground" size={15} />
                      {review.rating}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-4 leading-6 text-muted-foreground">{review.comment}</td>
                  <td className="px-4 py-4 text-xs font-bold text-foreground">
                    {review.isFeatured ? "Featured" : review.isVisible ? "Visible" : "Hidden"}
                  </td>
                  <td className="px-4 py-4"><ReviewActions review={review} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-14 text-center">
          <h2 className="font-display text-2xl">No customer reviews yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Completed-order reviews will appear here.</p>
        </div>
      )}
    </section>
  );
}
