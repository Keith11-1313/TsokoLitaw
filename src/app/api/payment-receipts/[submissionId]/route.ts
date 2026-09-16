import { getAuthProfile } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;
  const profile = await getAuthProfile();
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  if (!profile || !isUuid(submissionId)) return new Response("Not found", { status: 404, headers });
  const client = await createServerSupabaseClient();
  // Submission RLS grants the active owner or Admin only.
  const { data, error } = await client
    .from("manual_payment_submissions")
    .select("receipt_path")
    .eq("id", submissionId)
    .maybeSingle();
  if (error || !data) return new Response("Not found", { status: 404, headers });
  const receipt = await createAdminSupabaseClient()
    .storage.from("payment-receipts")
    .download(data.receipt_path);
  if (receipt.error || !receipt.data)
    return new Response("Receipt unavailable", { status: 404, headers });
  return new Response(receipt.data, {
    headers: { ...headers, "Content-Type": receipt.data.type, "X-Content-Type-Options": "nosniff" },
  });
}
