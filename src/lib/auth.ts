import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AccountRole } from "@/lib/roles";

export interface AuthProfile {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  role: AccountRole;
  deletionScheduledFor: string | null;
  avatarUrl: string | null;
}

export function getGoogleAvatarUrl(metadata: unknown) {
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
    .select("id, auth_user_id, full_name, email, role, is_active, deletion_scheduled_for")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to load the authenticated profile.", {
      cause: profileError,
    });
  }

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    authUserId: profile.auth_user_id,
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
  if (profile.role !== "customer") redirect("/admin");
  return profile;
}

export async function requireAdmin(nextPath = "/admin") {
  const profile = await getAuthProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (profile.role !== "admin") notFound();
  return profile;
}

export async function requireBusiness(nextPath = "/admin") {
  const profile = await getAuthProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (profile.role !== "admin" && profile.role !== "staff") notFound();
  return profile;
}

export async function requireStaff(nextPath = "/admin/orders") {
  const profile = await requireBusiness(nextPath);
  if (profile.role !== "staff") notFound();
  return profile;
}
