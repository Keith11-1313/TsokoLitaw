import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { PublicFeaturedReview } from "@/lib/server-reviews";
import { ReviewImageGallery } from "@/components/feedback/review-image-gallery";

export function CommunityReviews({
  reviews,
  totalCount,
  page,
  pageSize,
}: {
  reviews: PublicFeaturedReview[];
  totalCount: number;
  page: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <section
      id="community-reviews"
      className="mt-10 scroll-mt-24"
      aria-labelledby="reviews-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="reviews-heading" className="font-display text-2xl">
          Community highlights
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalCount} {totalCount === 1 ? "review" : "reviews"}
        </span>
      </div>
      <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <blockquote
            key={review.id}
            className="min-w-0 rounded-control border border-border bg-surface p-4"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="break-words text-sm font-bold">{review.customerName}</span>
              <time dateTime={review.reviewedAt} className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-PH", {
                  dateStyle: "medium",
                  timeZone: "Asia/Manila",
                }).format(new Date(review.reviewedAt))}
              </time>
            </header>
            <div className="mt-1.5 flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  size={13}
                  className={
                    index < review.rating
                      ? "fill-warning-foreground text-warning-foreground"
                      : "text-border"
                  }
                />
              ))}
            </div>
            {review.comment ? (
              <p className="mt-2 break-words text-base leading-6 [overflow-wrap:anywhere] sm:text-sm sm:leading-5">
                {review.comment}
              </p>
            ) : null}
            {review.orderedItems.length ? (
              <p className="mt-2 break-words text-xs leading-4 text-muted-foreground">
                <span className="sr-only">Ordered: </span>
                {review.orderedItems.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}
              </p>
            ) : null}
            {review.highlights.length ? (
              <p className="mt-2 text-xs text-muted-foreground">{review.highlights.join(" · ")}</p>
            ) : null}
            <ReviewImageGallery reviewId={review.id} imageCount={review.imageCount} compact />
          </blockquote>
        ))}
      </div>
      {pages > 1 ? (
        <nav
          aria-label="Community review pages"
          className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm"
        >
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page > 1 ? (
            <Link
              className="inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              href={`/journal?reviewsPage=${page - 1}#community-reviews`}
              aria-label="Previous review page"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              className="inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              href={`/journal?reviewsPage=${page + 1}#community-reviews`}
              aria-label="Next review page"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
