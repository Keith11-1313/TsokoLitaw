"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { moderateAdminReview } from "@/lib/server-reviews";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";

export type ReviewModerationResult = {
  status: "success" | "error";
  message: string;
};

export async function moderateReviewAction(input: {
  reviewId: string;
  isVisible: boolean;
  isFeatured: boolean;
}): Promise<ReviewModerationResult> {
  const admin = await requireAdmin("/admin/reviews");
  if (!isUuid(input.reviewId) || (input.isFeatured && !input.isVisible)) {
    return { status: "error", message: "That moderation update is invalid." };
  }

  try {
    await enforceMutationRateLimit({
      scope: "admin-review-moderation",
      userId: admin.id,
      maximumRequests: 30,
      windowSeconds: 300,
    });
    await moderateAdminReview({ adminId: admin.id, ...input });
    revalidatePath("/admin/reviews");
    revalidatePath("/journal");
    return { status: "success", message: "Review moderation saved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many updates. Try again in about ${error.retryAfterSeconds} seconds.`
        : "Review moderation could not be saved.",
    };
  }
}
