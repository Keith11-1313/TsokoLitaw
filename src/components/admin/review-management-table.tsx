"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { moderateReviewAction } from "@/app/admin/reviews/actions";
import { ReviewImageGallery } from "@/components/feedback/review-image-gallery";
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
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => update(!review.isFeatured, !review.isFeatured)}
          className="min-h-11 rounded-full bg-brand px-4 text-xs font-bold text-surface disabled:opacity-60"
        >
          {pending ? "Saving…" : review.isFeatured ? "Remove from Journal" : "Publish in Journal"}
        </button>
      </div>
      {message ? (
        <p role="alert" className="mt-2 text-xs text-danger-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function ReviewManagementTable({ reviews }: { reviews: AdminReviewSummary[] }) {
  return (
    <section className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
      {reviews.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-control border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-foreground">{review.customerName}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{review.orderNumber}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-bold text-foreground">
                    <Star
                      aria-hidden="true"
                      className="fill-warning-foreground text-warning-foreground"
                      size={15}
                    />
                    {review.rating}
                  </span>
                </div>
                <p className="mt-4 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                  {review.comment}
                </p>
                {review.highlights.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                ) : null}
                <ReviewImageGallery reviewId={review.id} imageCount={review.imageCount} />
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-foreground">
                  {review.isFeatured ? "Published in Journal" : "Not published"}
                </p>
                <div className="mt-4">
                  <ReviewActions review={review} />
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
                        <Star
                          aria-hidden="true"
                          className="fill-warning-foreground text-warning-foreground"
                          size={15}
                        />
                        {review.rating}
                      </span>
                    </td>
                    <td className="max-w-md break-words px-4 py-4 leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                      {review.comment || <span className="italic">No comment</span>}
                      {review.highlights.length ? (
                        <p className="mt-2 text-xs font-bold text-foreground">
                          {review.highlights.join(" · ")}
                        </p>
                      ) : null}
                      <ReviewImageGallery reviewId={review.id} imageCount={review.imageCount} />
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-foreground">
                      {review.isFeatured ? "Published in Journal" : "Not published"}
                    </td>
                    <td className="px-4 py-4">
                      <ReviewActions review={review} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="py-14 text-center">
          <h2 className="font-display text-2xl">No customer reviews yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reviews from completed orders will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
