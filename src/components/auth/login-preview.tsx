"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PrimaryButton, secondaryButtonClassName } from "@/components/ui/button";

export function LoginPreview({ nextPath }: { nextPath: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  async function signInWithGoogle() {
    setIsStarting(true);
    setErrorMessage(null);
    const supabase = createBrowserSupabaseClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsStarting(false);
    }
  }

  return (
    <>
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-muted text-brand"><LogIn aria-hidden="true" size={26} /></span>
      <h1 className="mt-6 font-display text-4xl leading-tight text-brand">Sign in to TsokoLitaw</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">New and returning customers use Google to order, track campus pickups, and review completed orders.</p>
      <PrimaryButton className="mt-8 w-full" type="button" onClick={signInWithGoogle} disabled={isStarting}>
        {isStarting ? "Opening Google…" : "Continue with Google"}
      </PrimaryButton>
      {errorMessage ? <p role="alert" className="mt-5 rounded-control bg-danger-background p-3 text-sm text-danger-foreground">{errorMessage}</p> : null}
      <Link className={`${secondaryButtonClassName} mt-6 w-full`} href="/">Return home</Link>
    </>
  );
}
