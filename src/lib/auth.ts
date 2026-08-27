import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string | null;
  role: "customer" | "admin";
  deletionScheduledFor: string | null;
}

export const getAuthProfile = cache(async (): Promise<AuthProfile | null> => {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, mobile_number, role, deletion_scheduled_for")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to load the authenticated profile.", {
      cause: profileError,
    });
  }

  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    mobileNumber: profile.mobile_number,
    role: profile.role,
    deletionScheduledFor: profile.deletion_scheduled_for,
  };
});

export async function requireCustomer(nextPath: string) {
  const profile = await getAuthProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return profile;
}

export async function requireAdmin(nextPath = "/admin") {
  const profile = await getAuthProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (profile.role !== "admin") redirect("/unauthorized");
  return profile;
}
