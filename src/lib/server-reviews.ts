import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateUploadedImage } from "@/lib/server-image-validation";
import type { ReviewOrderItemSummary } from "@/lib/reviews";

export interface CustomerReviewContext {
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

export interface AdminReviewSummary {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  rating: number;
  comment: string;
  highlights: string[];
  hasImage: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export interface PublicFeaturedReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  highlights: string[];
  hasImage: boolean;
}

interface ReviewContextRow {
  id: string;
  order_number: string;
  status: string;
  order_items: Array<{
    variant_name_snapshot: string;
    quantity: number;
    order_item_coatings: Array<{
      coating_name_snapshot: string;
      piece_count: number;
    }> | null;
  }> | null;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    highlights: string[];
    image_path: string | null;
    created_at: string;
  }> | null;
}

export async function getCustomerReviewContext(
  userId: string,
  orderId: string,
): Promise<CustomerReviewContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      order_items (
        variant_name_snapshot,
        quantity,
        order_item_coatings (
          coating_name_snapshot,
          piece_count
        )
      ),
      reviews (
        id,
        rating,
        comment,
        highlights,
        image_path,
        created_at
      )
    `,
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .maybeSingle();

  if (error) throw new Error("Review eligibility could not be loaded.", { cause: error });
  if (!data) return null;

  const order = data as unknown as ReviewContextRow;
  const existingReview = order.reviews?.[0] ?? null;
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    itemSummary: (order.order_items ?? []).map((item) => ({
      name: item.variant_name_snapshot,
      quantity: item.quantity,
      coatings: (item.order_item_coatings ?? []).map(
        (coating) => `${coating.coating_name_snapshot} × ${coating.piece_count}`,
      ),
    })),
    existingReview: existingReview
      ? {
          id: existingReview.id,
          rating: existingReview.rating,
          comment: existingReview.comment,
          highlights: existingReview.highlights,
          hasImage: Boolean(existingReview.image_path),
          createdAt: existingReview.created_at,
        }
      : null,
  };
}

export async function submitCustomerReview(input: {
  userId: string;
  orderId: string;
  rating: number;
  comment: string;
  highlights: string[];
  imagePath: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("submit_order_review", {
    target_user_id: input.userId,
    target_order_id: input.orderId,
    rating_value: input.rating,
    comment_value: input.comment,
    highlights_value: input.highlights,
    ...(input.imagePath ? { image_path_value: input.imagePath } : {}),
  });

  if (error) {
    if (error.message.includes("already has a review")) {
      throw new Error("This order has already been reviewed.");
    }
    if (error.message.includes("Only completed")) {
      throw new Error("Only completed orders can be reviewed.");
    }
    throw new Error("Your review could not be submitted.", { cause: error });
  }
  return data as string;
}

export async function uploadReviewImage(input: { userId: string; orderId: string; file: File }) {
  const validated = await validateUploadedImage(input.file, { label: "review image" });
  const path = `${input.userId}/${input.orderId}/${crypto.randomUUID()}.${validated.extension}`;
  const { error } = await createAdminSupabaseClient()
    .storage.from("review-media")
    .upload(path, validated.buffer, {
      contentType: validated.contentType,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error("Your review image could not be uploaded.", { cause: error });
  return path;
}

export async function removeReviewImage(path: string) {
  const { error } = await createAdminSupabaseClient().storage.from("review-media").remove([path]);
  if (error) throw new Error("The new review image could not be cleaned up.", { cause: error });
}

export async function getAdminReviews(): Promise<AdminReviewSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      order_id,
      display_name_snapshot,
      rating,
      comment,
      highlights,
      image_path,
      is_visible,
      is_featured,
      created_at,
      orders (order_number)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error("Admin reviews could not be loaded.", { cause: error });

  return (data ?? []).map((review) => {
    const order = review.orders as unknown as { order_number: string } | null;
    return {
      id: review.id,
      orderId: review.order_id,
      orderNumber: order?.order_number ?? "Unknown order",
      customerName: review.display_name_snapshot,
      rating: review.rating,
      comment: review.comment,
      highlights: review.highlights,
      hasImage: Boolean(review.image_path),
      isVisible: review.is_visible,
      isFeatured: review.is_featured,
      createdAt: review.created_at,
    };
  });
}

export async function getPublicFeaturedReviews(): Promise<PublicFeaturedReview[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, display_name_snapshot, rating, comment, highlights, image_path")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw new Error("Featured reviews could not be loaded.", { cause: error });

  return (data ?? []).map((review) => ({
    id: review.id,
    customerName: review.display_name_snapshot,
    rating: review.rating,
    comment: review.comment,
    highlights: review.highlights,
    hasImage: Boolean(review.image_path),
  }));
}

export async function moderateAdminReview(input: {
  adminId: string;
  reviewId: string;
  isVisible: boolean;
  isFeatured: boolean;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("moderate_order_review", {
    target_admin_id: input.adminId,
    target_review_id: input.reviewId,
    visible_value: input.isVisible,
    featured_value: input.isFeatured,
  });

  if (error) throw new Error("Review moderation could not be saved.", { cause: error });
}
