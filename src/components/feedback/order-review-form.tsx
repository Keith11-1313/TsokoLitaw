"use client";

import { useActionState, useEffect, useState } from "react";
import { Sparkles, Star } from "lucide-react";
import { submitReviewAction, type ReviewActionState } from "@/app/orders/[orderId]/review/actions";
import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { cn } from "@/lib/cn";
import { REVIEW_HIGHLIGHTS, type ReviewOrderItemSummary } from "@/lib/reviews";

const initialState: ReviewActionState = { status: "idle", message: "" };

interface OrderReviewFormProps {
  orderId: string;
  orderNumber: string;
  itemSummary: ReviewOrderItemSummary[];
  existingReview: null | {
    id: string;
    rating: number;
    comment: string;
    highlights: string[];
    hasImage: boolean;
    createdAt: string;
  };
}

const ratingDescriptions = [
  "",
  "Disappointing",
  "Could be better",
  "Good",
  "Very good",
  "Excellent",
];

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex justify-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          size={22}
          className={cn("text-warning-foreground", index < rating && "fill-warning-foreground")}
        />
      ))}
    </div>
  );
}

export function OrderReviewForm({
  orderId,
  orderNumber,
  itemSummary,
  existingReview,
}: OrderReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  if (existingReview || state.status === "success") {
    const savedRating = existingReview?.rating ?? rating;
    return (
      <section className="relative overflow-hidden py-4 text-center">
        <Sparkles
          aria-hidden="true"
          className="mx-auto mb-3 text-warning-foreground motion-safe:animate-pulse"
          size={34}
        />
        <ReviewStars rating={savedRating} />
        <h2 className="mt-4 font-display text-2xl">Thank you</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Thank you. Your review is very much appreciated.
        </p>
        {existingReview?.comment ? (
          <p className="mx-auto mt-4 max-w-xl rounded-control bg-surface-muted p-4 text-sm leading-6">
            {existingReview.comment}
          </p>
        ) : null}
        {existingReview?.highlights.length ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {existingReview.highlights.map((highlight) => (
              <span
                key={highlight}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-brand"
              >
                {highlight}
              </span>
            ))}
          </div>
        ) : null}
        {existingReview?.hasImage ? (
          <a
            href={`/api/review-images/${existingReview.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4"
          >
            View your review image
          </a>
        ) : null}
      </section>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="rounded-control bg-surface-muted p-4 text-sm">
        <p className="font-bold">Your order</p>
        <ul className="mt-3 space-y-3">
          {itemSummary.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="border-t border-border pt-3 first:border-0 first:pt-0"
            >
              <p className="flex justify-between gap-4 font-bold">
                <span>{item.name}</span>
                <span>× {item.quantity}</span>
              </p>
              {item.coatings.length ? (
                <p className="mt-1 leading-6 text-muted-foreground">{item.coatings.join(" · ")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-center text-sm font-bold">Rating for {orderNumber}</p>
      <fieldset className="mt-5">
        <legend className="sr-only">Choose a rating</legend>
        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star rating`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Star
                className={cn(
                  "text-warning-foreground",
                  value <= rating && "fill-warning-foreground",
                )}
              />
            </button>
          ))}
        </div>
        <p className="mt-3 min-h-6 text-center text-sm font-bold text-brand" aria-live="polite">
          {rating ? ratingDescriptions[rating] : "Select one to five stars"}
        </p>
      </fieldset>
      <fieldset className="mt-6">
        <legend className="text-sm font-bold">Tasting highlights (optional)</legend>
        <p className="mt-1 text-xs text-muted-foreground">Choose every detail that stood out.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REVIEW_HIGHLIGHTS.map((highlight) => (
            <label key={highlight} className="cursor-pointer">
              <input type="checkbox" name="highlights" value={highlight} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-bold transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-surface peer-focus-visible:ring-2 peer-focus-visible:ring-focus">
                {highlight}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormField
        id="review-comment"
        label="Tell us about your box and pickup experience (optional)"
        as="textarea"
        error={state.fieldErrors?.comment}
        className="mt-6"
        textareaProps={{
          name: "comment",
          maxLength: 1000,
          placeholder: "What did you enjoy?",
          value: comment,
          onChange: (event) => setComment(event.currentTarget.value.slice(0, 1000)),
        }}
      />
      <p className="mt-2 text-right text-xs font-bold text-muted-foreground" aria-live="polite">
        {comment.length}/1000
      </p>
      <ImageUploadField
        id="review-image"
        name="image"
        label="Add a review image (optional)"
        className="mt-6"
        disabled={pending}
        fileName={image?.name}
        previewUrl={previewUrl}
        error={state.fieldErrors?.image}
        onChange={(event) => {
          const nextImage = event.currentTarget.files?.[0] ?? null;
          setImage(nextImage);
          setPreviewUrl(nextImage ? URL.createObjectURL(nextImage) : "");
        }}
      />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Your image stays private unless an administrator approves this review for public display.
      </p>
      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-5 rounded-control bg-danger-background p-4 text-sm text-danger-foreground"
        >
          {state.message}
        </p>
      ) : null}
      {state.fieldErrors?.rating ? (
        <p className="mt-3 text-center text-xs font-bold text-danger-foreground">
          {state.fieldErrors.rating}
        </p>
      ) : null}
      <PrimaryButton className="mt-6 w-full" type="submit" disabled={!rating || pending}>
        {pending ? "Submitting review…" : "Submit review"}
      </PrimaryButton>
    </form>
  );
}
