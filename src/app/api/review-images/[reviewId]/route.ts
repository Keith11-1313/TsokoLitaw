import { getAuthProfile } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  if (!isUuid(reviewId)) return new Response("Not found", { status: 404, headers });

  const admin = createAdminSupabaseClient();
  const { data: review, error } = await admin
    .from("reviews")
    .select("user_id, image_paths, is_visible")
    .eq("id", reviewId)
    .maybeSingle();
  const indexValue = new URL(request.url).searchParams.get("index") ?? "0";
  const index = Number(indexValue);
  if (
    error ||
    !review?.image_paths?.length ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= review.image_paths.length
  )
    return new Response("Not found", { status: 404, headers });

  if (!review.is_visible) {
    const profile = await getAuthProfile();
    if (!profile || (profile.role !== "admin" && profile.id !== review.user_id)) {
      return new Response("Not found", { status: 404, headers });
    }
  }

  const image = await admin.storage.from("review-media").download(review.image_paths[index]);
  if (image.error || !image.data)
    return new Response("Image unavailable", { status: 404, headers });
  return new Response(image.data, {
    headers: {
      ...headers,
      "Content-Type": image.data.type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
