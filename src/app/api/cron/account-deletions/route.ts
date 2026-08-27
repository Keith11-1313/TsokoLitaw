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
    .not("deletion_scheduled_for", "is", null)
    .lte("deletion_scheduled_for", now)
    .limit(100);

  if (dueProfilesError) {
    console.error("[account-deletions] Unable to load due profiles", dueProfilesError);
    return NextResponse.json({ error: "Unable to load due accounts" }, { status: 500 });
  }

  let deleted = 0;
  let deferred = 0;
  const failures: string[] = [];

  for (const profile of dueProfiles ?? []) {
    const { data: prepared, error: prepareError } = await supabase.rpc(
      "prepare_account_for_deletion",
      { target_user_id: profile.id },
    );

    if (prepareError) {
      console.error("[account-deletions] Preparation failed", {
        userId: profile.id,
        error: prepareError,
      });
      failures.push(profile.id);
      continue;
    }

    if (!prepared) {
      deferred += 1;
      continue;
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id);
    if (deleteError) {
      console.error("[account-deletions] Auth user deletion failed", {
        userId: profile.id,
        error: deleteError,
      });
      failures.push(profile.id);
      continue;
    }

    deleted += 1;
  }

  return NextResponse.json({ examined: dueProfiles?.length ?? 0, deleted, deferred, failures });
}
