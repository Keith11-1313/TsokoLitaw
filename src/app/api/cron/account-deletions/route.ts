import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    console.error("[account-deletions] Unable to load due profiles", dueProfilesError);
    return NextResponse.json({ error: "Unable to load due accounts" }, { status: 500 });
  }

  let deactivated = 0;
  let deferred = 0;
  const failures: string[] = [];

  for (const profile of dueProfiles ?? []) {
    const { data: accountDeactivated, error: deactivationError } = await supabase.rpc(
      "deactivate_due_account",
      { target_user_id: profile.id },
    );

    if (deactivationError) {
      console.error("[account-deletions] Deactivation failed", {
        userId: profile.id,
        error: deactivationError,
      });
      failures.push(profile.id);
      continue;
    }

    if (!accountDeactivated) {
      deferred += 1;
      continue;
    }

    deactivated += 1;
  }

  return NextResponse.json({
    examined: dueProfiles?.length ?? 0,
    deactivated,
    deferred,
    failures,
  });
}
