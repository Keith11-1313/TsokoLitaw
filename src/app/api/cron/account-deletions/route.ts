import { NextResponse } from "next/server";
import { CRON_RESPONSE_HEADERS, isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CRON_RESPONSE_HEADERS });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: dueProfiles, error: dueProfilesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "customer")
    .eq("is_active", true)
    .not("deletion_scheduled_for", "is", null)
    .lte("deletion_scheduled_for", now)
    .limit(100);

  if (dueProfilesError) {
    console.error("[account-deletions] Unable to load due profiles", {
      errorCode: dueProfilesError.code,
    });
    return NextResponse.json({ error: "Unable to load due accounts" }, { status: 500, headers: CRON_RESPONSE_HEADERS });
  }

  let deactivated = 0;
  let deferred = 0;
  let failed = 0;

  for (const profile of dueProfiles ?? []) {
    const { data: accountDeactivated, error: deactivationError } = await supabase.rpc(
      "deactivate_due_account",
      { target_user_id: profile.id },
    );

    if (deactivationError) {
      console.error("[account-deletions] Deactivation failed", {
        errorCode: deactivationError.code,
      });
      failed += 1;
      continue;
    }

    if (!accountDeactivated) {
      deferred += 1;
      continue;
    }

    deactivated += 1;
  }

  const { data: prunedRateLimitBuckets, error: rateLimitPruneError } = await supabase.rpc(
    "prune_mutation_rate_limit_buckets",
  );

  if (rateLimitPruneError) {
    console.error("[account-deletions] Unable to prune expired rate-limit buckets", {
      errorCode: rateLimitPruneError.code,
    });
  }

  return NextResponse.json({
    examined: dueProfiles?.length ?? 0,
    deactivated,
    deferred,
    failed,
    prunedRateLimitBuckets: prunedRateLimitBuckets ?? 0,
  }, { headers: CRON_RESPONSE_HEADERS });
}
