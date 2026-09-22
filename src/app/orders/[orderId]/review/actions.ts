"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { removeReviewImage, submitCustomerReview, uploadReviewImage } from "@/lib/server-reviews";
import { REVIEW_HIGHLIGHTS } from "@/lib/reviews";
import { enforceMutationRateLimit, MutationRateLimitError } from "@/lib/server-rate-limit";

export type ReviewActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function submitReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const orderId = String(formData.get("orderId") ?? "");
  const profile = await requireCustomer(`/orders/${orderId}/review`);
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  const highlights = formData.getAll("highlights").map(String);
  const image = formData.get("image");

  if (!isUuid(orderId)) {
    return { status: "error", message: "That completed order is unavailable." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return {
      status: "error",
      message: "Choose a rating from one to five stars.",
      fieldErrors: { rating: "Choose one to five stars." },
    };
  }
  if (comment.length > 1000) {
    return {
      status: "error",
      message: "Your optional comment is too long.",
      fieldErrors: { comment: "Use no more than 1,000 characters." },
    };
  }
  if (
    highlights.length > REVIEW_HIGHLIGHTS.length ||
    new Set(highlights).size !== highlights.length ||
    highlights.some(
      (highlight) => !REVIEW_HIGHLIGHTS.includes(highlight as (typeof REVIEW_HIGHLIGHTS)[number]),
    )
  ) {
    return { status: "error", message: "Choose valid tasting highlights." };
  }
  if (image instanceof File && image.size > 0) {
    if (
      !new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type) ||
      image.size > 3 * 1024 * 1024
    ) {
      return {
        status: "error",
        message: "Upload a JPG, PNG, or WebP image no larger than 3 MB.",
        fieldErrors: { image: "Choose a JPG, PNG, or WebP image no larger than 3 MB." },
      };
    }
  }

  let uploadedPath: string | null = null;
  try {
    await enforceMutationRateLimit({
      scope: "review-submit",
      userId: profile.id,
      maximumRequests: 4,
      windowSeconds: 600,
    });
    if (image instanceof File && image.size > 0) {
      uploadedPath = await uploadReviewImage({ userId: profile.id, orderId, file: image });
    }
    await submitCustomerReview({
      userId: profile.id,
      orderId,
      rating,
      comment,
      highlights,
      imagePath: uploadedPath,
    });
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}/review`);
    revalidatePath("/admin/journal");
    return { status: "success", message: "Thank you. Your review is very much appreciated." };
  } catch (error) {
    if (uploadedPath) {
      try {
        await removeReviewImage(uploadedPath);
      } catch (cleanupError) {
        console.error("Review image cleanup failed", cleanupError);
      }
    }
    return {
      status: "error",
      message:
        error instanceof MutationRateLimitError
          ? `Too many attempts. Try again in about ${error.retryAfterSeconds} seconds.`
          : error instanceof Error
            ? error.message
            : "Your review could not be submitted.",
    };
  }
}
