"use client";

import { useActionState, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction, type ReviewActionState } from "@/app/orders/[orderId]/review/actions";
import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { ReviewImageGallery } from "@/components/feedback/review-image-gallery";
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
    imageCount: number;
    createdAt: string;
  };
  onSubmitted?: () => void;
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
  onSubmitted,
}: OrderReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);

  useEffect(
    () => () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [previewUrls],
  );

  useEffect(() => {
    if (state.status === "success") onSubmitted?.();
  }, [onSubmitted, state.status]);

  if (existingReview || state.status === "success") {
    const savedRating = existingReview?.rating ?? rating;
    return (
      <section className="py-4 text-center">
        <ReviewStars rating={savedRating} />
        <h2 className="mt-4 font-display text-2xl">Review submitted</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Your review is very much appreciated.
        </p>
        <div className="mx-auto mt-5 max-w-xl rounded-control border border-border bg-surface-muted p-4 text-left text-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Your order
          </p>
          {itemSummary.map((item, index) => (
            <div key={`${item.name}-${index}`} className="mt-3">
              <p className="font-bold">
                {item.name} × {item.quantity}
              </p>
              {item.coatings.length ? (
                <p className="mt-1 break-words leading-6 text-muted-foreground">
                  {item.coatings.join(" · ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
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
        {existingReview ? (
          <div className="mx-auto max-w-xl">
            <ReviewImageGallery
              reviewId={existingReview.id}
              imageCount={existingReview.imageCount}
            />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="rounded-control border border-border bg-surface-muted p-4 text-sm sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Order summary
        </p>
        <ul className="mt-4 space-y-4">
          {itemSummary.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="border-t border-border pt-4 first:border-0 first:pt-0"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-bold leading-6">{item.name}</p>
                <span className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold">
                  {item.quantity} {item.quantity === 1 ? "box" : "boxes"}
                </span>
              </div>
              {item.coatings.length ? (
                <div className="mt-3 border-l-2 border-brand/25 pl-3">
                  <p className="text-xs font-bold text-muted-foreground">Coatings</p>
                  <p className="mt-1 leading-6 text-brand">{item.coatings.join(" · ")}</p>
                </div>
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
        {rating ? (
          <p className="mt-3 text-center text-sm font-bold text-brand" aria-live="polite">
            {ratingDescriptions[rating]}
          </p>
        ) : null}
      </fieldset>
      <fieldset className="mt-6">
        <legend className="text-sm font-bold">What stood out?</legend>
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
        label="Tell us about your experience"
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
        name="images"
        label="Add review images (optional)"
        className="mt-6"
        disabled={pending}
        multiple
        maxFiles={5}
        fileNames={images.map((image) => image.name)}
        previewUrls={previewUrls}
        error={imageError || state.fieldErrors?.image}
        onChange={(event) => {
          const nextImages = Array.from(event.currentTarget.files ?? []);
          const invalid =
            nextImages.length > 5 ||
            nextImages.some(
              (image) =>
                !["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
                image.size > 3 * 1024 * 1024,
            );
          previewUrls.forEach((url) => URL.revokeObjectURL(url));
          if (invalid) {
            event.currentTarget.value = "";
            setImages([]);
            setPreviewUrls([]);
            setImageError("Choose up to five JPG, PNG, or WebP images no larger than 3 MB each.");
            return;
          }
          setImageError("");
          setImages(nextImages);
          setPreviewUrls(nextImages.map((image) => URL.createObjectURL(image)));
        }}
      />
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
