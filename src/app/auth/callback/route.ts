import { NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/auth-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription = requestUrl.searchParams.get("error_description");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"), "/profile");

  if (providerError) {
    console.error("[auth/callback] OAuth provider returned an error", {
      code: providerError,
      description: providerErrorDescription,
    });

    return NextResponse.redirect(`${requestUrl.origin}/auth/error?reason=provider`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");

      if (process.env.NODE_ENV !== "development" && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${nextPath}`);
      }

      return NextResponse.redirect(`${requestUrl.origin}${nextPath}`);
    }

    console.error("[auth/callback] Supabase code exchange failed", {
      code: error.code,
      message: error.message,
      status: error.status,
    });

    return NextResponse.redirect(`${requestUrl.origin}/auth/error?reason=exchange`);
  }

  console.error("[auth/callback] OAuth callback did not include an authorization code");
  return NextResponse.redirect(`${requestUrl.origin}/auth/error?reason=missing-code`);
}
