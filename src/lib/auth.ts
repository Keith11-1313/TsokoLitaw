import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string;
  role: "customer" | "admin";
  deletionScheduledFor: string | null;
  avatarUrl: string | null;
}

function getGoogleAvatarUrl(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const values = metadata as Record<string, unknown>;
  const candidate = values.avatar_url ?? values.picture;
  if (typeof candidate !== "string") return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname === "lh3.googleusercontent.com"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export const getAuthProfile = cache(async (): Promise<AuthProfile | null> => {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, deletion_scheduled_for")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to load the authenticated profile.", {
      cause: profileError,
    });
  }

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    deletionScheduledFor: profile.deletion_scheduled_for,
    avatarUrl: getGoogleAvatarUrl(claimsData.claims.user_metadata),
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
  if (profile.role !== "admin") notFound();
  return profile;
}
