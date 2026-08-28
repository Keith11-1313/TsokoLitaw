"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { submitCustomerReview } from "@/lib/server-reviews";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";

export type ReviewActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function submitReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const orderId = String(formData.get("orderId") ?? "");
  const profile = await requireCustomer(`/orders/${orderId}/review`);
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!isUuid(orderId)) {
    return { status: "error", message: "That completed order is unavailable." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "error", message: "Choose a rating from one to five stars." };
  }
  if (comment.length < 10 || comment.length > 1000) {
    return { status: "error", message: "Write a review between 10 and 1000 characters." };
  }

  try {
    await enforceMutationRateLimit({
      scope: "review-submit",
      userId: profile.id,
      maximumRequests: 4,
      windowSeconds: 600,
    });
    await submitCustomerReview({ userId: profile.id, orderId, rating, comment });
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}/review`);
    revalidatePath("/admin/journal");
    return { status: "success", message: "Thank you. Your review has been submitted." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many attempts. Try again in about ${error.retryAfterSeconds} seconds.`
        : error instanceof Error ? error.message : "Your review could not be submitted.",
    };
  }
}
