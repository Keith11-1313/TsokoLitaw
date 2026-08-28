"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import {
  submitReviewAction,
  type ReviewActionState,
} from "@/app/orders/[orderId]/review/actions";
import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";

const initialState: ReviewActionState = { status: "idle", message: "" };

interface OrderReviewFormProps {
  orderId: string;
  orderNumber: string;
  existingReview: null | {
    rating: number;
    comment: string;
    createdAt: string;
  };
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex justify-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          size={22}
          className={cn(
            "text-warning-foreground",
            index < rating && "fill-warning-foreground",
          )}
        />
      ))}
    </div>
  );
}

export function OrderReviewForm({ orderId, orderNumber, existingReview }: OrderReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);

  if (existingReview || state.status === "success") {
    const savedRating = existingReview?.rating ?? rating;
    return (
      <section className="rounded-card border border-border bg-surface p-8 text-center">
        <ReviewStars rating={savedRating} />
        <h2 className="mt-4 font-display text-2xl">Thank you for reviewing {orderNumber}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {existingReview?.comment ?? state.message}
        </p>
        <p className="mt-5 text-xs text-muted-foreground">Each completed order can be reviewed once.</p>
      </section>
    );
  }

  return (
    <form action={formAction} className="rounded-card border border-border bg-surface p-6 sm:p-8">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <p className="text-sm font-bold">Rating for {orderNumber}</p>
      <fieldset className="mt-5">
        <legend className="sr-only">Choose a rating</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star rating`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              className="flex size-12 items-center justify-center rounded-control bg-surface-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Star className={cn("text-warning-foreground", value <= rating && "fill-warning-foreground")} />
            </button>
          ))}
        </div>
      </fieldset>
      <FormField
        id="review-comment"
        label="Tell us about your box and pickup experience"
        as="textarea"
        required
        className="mt-6"
        textareaProps={{
          name: "comment",
          minLength: 10,
          maxLength: 1000,
          placeholder: "What did you enjoy?",
        }}
      />
      {state.status === "error" ? (
        <p role="alert" className="mt-5 rounded-control bg-danger-background p-4 text-sm text-danger-foreground">
          {state.message}
        </p>
      ) : null}
      <PrimaryButton className="mt-6 w-full" type="submit" disabled={!rating || pending}>
        {pending ? "Submitting review…" : "Submit review"}
      </PrimaryButton>
    </form>
  );
}
