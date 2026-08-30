import { NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/auth-redirect";
import { getTrustedRequestOrigin } from "@/lib/site-url";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"), "/profile");
  const redirectOrigin = getTrustedRequestOrigin(requestUrl);

  if (providerError) {
    console.error("[auth/callback] OAuth provider returned an error", {
      code: providerError,
    });

    return NextResponse.redirect(`${redirectOrigin}/auth/error?reason=provider`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const userId = sessionData.user?.id;

      if (!userId) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/auth/error?reason=profile`);
      }

      const adminSupabase = createAdminSupabaseClient();
      const { data: profile, error: profileError } = await adminSupabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("[auth/callback] Authenticated profile status could not be loaded", {
          errorCode: profileError?.code ?? "PROFILE_NOT_FOUND",
        });
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/auth/error?reason=profile`);
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${redirectOrigin}/auth/account-deleted`);
      }

      return NextResponse.redirect(`${redirectOrigin}${nextPath}`);
    }

    console.error("[auth/callback] Supabase code exchange failed", {
      code: error.code,
      status: error.status,
    });

    return NextResponse.redirect(`${redirectOrigin}/auth/error?reason=exchange`);
  }

  console.error("[auth/callback] OAuth callback did not include an authorization code");
  return NextResponse.redirect(`${redirectOrigin}/auth/error?reason=missing-code`);
}
