"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import {
  isJournalContentType,
  isJournalIconKey,
  isJournalStatus,
} from "@/lib/journal";
import {
  saveAdminJournalPost,
  uploadJournalCover,
} from "@/lib/server-journal";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";

export type JournalActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function saveJournalPostAction(
  _previousState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const admin = await requireAdmin("/admin/journal");
  const postIdValue = String(formData.get("postId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const contentType = String(formData.get("contentType") ?? "");
  const iconKey = String(formData.get("iconKey") ?? "");
  const displayDate = String(formData.get("displayDate") ?? "");
  const status = String(formData.get("status") ?? "");
  const existingCoverImageUrl = String(formData.get("existingCoverImageUrl") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const removeCover = formData.get("removeCover") === "on";
  const coverImage = formData.get("coverImage");

  if (postIdValue && !isUuid(postIdValue)) {
    return { status: "error", message: "That Journal post is unavailable." };
  }
  if (title.length < 3 || title.length > 120) {
    return { status: "error", message: "Use a title between 3 and 120 characters." };
  }
  if (excerpt.length > 240) {
    return { status: "error", message: "The summary cannot exceed 240 characters." };
  }
  if (content.length < 10 || content.length > 5000) {
    return { status: "error", message: "Use content between 10 and 5,000 characters." };
  }
  if (!isJournalContentType(contentType) || !isJournalIconKey(iconKey) || !isJournalStatus(status)) {
    return { status: "error", message: "Choose valid Journal type, icon, and publication values." };
  }
  if (!datePattern.test(displayDate) || Number.isNaN(Date.parse(`${displayDate}T00:00:00Z`))) {
    return { status: "error", message: "Choose a valid display date." };
  }
  if (videoUrl && !/^https:\/\//i.test(videoUrl)) {
    return { status: "error", message: "Video links must use a secure https:// URL." };
  }
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!allowedImageTypes.has(coverImage.type) || coverImage.size > 3 * 1024 * 1024) {
      return { status: "error", message: "Upload a JPG, PNG, or WebP image no larger than 3 MB." };
    }
  }

  try {
    await enforceMutationRateLimit({
      scope: "admin-journal-save",
      userId: admin.id,
      maximumRequests: 20,
      windowSeconds: 300,
    });

    let coverImageUrl = removeCover ? "" : existingCoverImageUrl;
    if (coverImage instanceof File && coverImage.size > 0) {
      coverImageUrl = await uploadJournalCover({ adminId: admin.id, file: coverImage });
    }

    await saveAdminJournalPost({
      adminId: admin.id,
      postId: postIdValue || null,
      title,
      excerpt,
      content,
      contentType,
      iconKey,
      displayDate,
      coverImageUrl,
      videoUrl,
      status,
    });

    revalidatePath("/admin/journal");
    revalidatePath("/journal");
    return { status: "success", message: "Journal post saved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many updates. Try again in about ${error.retryAfterSeconds} seconds.`
        : error instanceof Error ? error.message : "Journal post could not be saved.",
    };
  }
}
