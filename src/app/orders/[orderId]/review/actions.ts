"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { removeReviewImages, submitCustomerReview, uploadReviewImages } from "@/lib/server-reviews";
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
  const images = formData
    .getAll("images")
    .filter((image): image is File => image instanceof File && image.size > 0);

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
  if (
    images.length > 5 ||
    images.some(
      (image) =>
        !new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type) ||
        image.size > 3 * 1024 * 1024,
    )
  ) {
    return {
      status: "error",
      message: "Upload up to five JPG, PNG, or WebP images no larger than 3 MB each.",
      fieldErrors: { image: "Choose up to five valid images no larger than 3 MB each." },
    };
  }

  let uploadedPaths: string[] = [];
  try {
    await enforceMutationRateLimit({
      scope: "review-submit",
      userId: profile.id,
      maximumRequests: 4,
      windowSeconds: 600,
    });
    if (images.length)
      uploadedPaths = await uploadReviewImages({ userId: profile.id, orderId, files: images });
    await submitCustomerReview({
      userId: profile.id,
      orderId,
      rating,
      comment,
      highlights,
      imagePaths: uploadedPaths,
    });
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}/review`);
    revalidatePath("/admin/journal");
    return { status: "success", message: "Thank you. Your review is very much appreciated." };
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await removeReviewImages(uploadedPaths);
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
