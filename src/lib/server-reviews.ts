import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CustomerReviewContext {
  orderId: string;
  orderNumber: string;
  itemSummary: string;
  existingReview: null | {
    id: string;
    rating: number;
    comment: string;
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
  isVisible: boolean;
  isFeatured: boolean;
  createdAt: string;
}

interface ReviewContextRow {
  id: string;
  order_number: string;
  status: string;
  order_items: Array<{
    variant_name_snapshot: string;
    quantity: number;
  }> | null;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
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
    .select(`
      id,
      order_number,
      status,
      order_items (
        variant_name_snapshot,
        quantity
      ),
      reviews (
        id,
        rating,
        comment,
        created_at
      )
    `)
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
    itemSummary: (order.order_items ?? [])
      .map((item) => `${item.variant_name_snapshot} × ${item.quantity}`)
      .join(", "),
    existingReview: existingReview ? {
      id: existingReview.id,
      rating: existingReview.rating,
      comment: existingReview.comment,
      createdAt: existingReview.created_at,
    } : null,
  };
}

export async function submitCustomerReview(input: {
  userId: string;
  orderId: string;
  rating: number;
  comment: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("submit_order_review", {
    target_user_id: input.userId,
    target_order_id: input.orderId,
    rating_value: input.rating,
    comment_value: input.comment,
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

export async function getAdminReviews(): Promise<AdminReviewSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      order_id,
      display_name_snapshot,
      rating,
      comment,
      is_visible,
      is_featured,
      created_at,
      orders (order_number)
    `)
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
      isVisible: review.is_visible,
      isFeatured: review.is_featured,
      createdAt: review.created_at,
    };
  });
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
