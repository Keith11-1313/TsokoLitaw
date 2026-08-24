"use client";

import { LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthPreview } from "@/components/auth/auth-preview-provider";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

export function LoginPreview() {
  const router = useRouter();
  const { isReady, isSignedIn, signInPreview, signOut } = useAuthPreview();

  if (!isReady) return <p role="status" className="text-sm text-muted-foreground">Loading account preview…</p>;

  if (isSignedIn) {
    return (
      <>
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-muted text-brand"><UserRound aria-hidden="true" size={26} /></span>
        <h1 className="mt-6 font-display text-3xl text-brand">You’re signed in</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">The frontend account preview is active. Real Google authentication has not been connected yet.</p>
        <PrimaryButton className="mt-8 w-full" onClick={() => router.push("/profile")}>View profile</PrimaryButton>
        <SecondaryButton className="mt-3 w-full" onClick={() => { signOut(); router.replace("/login"); }}><LogOut aria-hidden="true" size={17} />Log out</SecondaryButton>
      </>
    );
  }

  return (
    <>
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-muted text-brand"><LogIn aria-hidden="true" size={26} /></span>
      <h1 className="mt-6 font-script text-[3.25rem] leading-none text-brand">Sign in to TsokoLitaw</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">New and returning customers use Google to order, track campus pickups, and review completed orders.</p>
      <PrimaryButton className="mt-8 w-full" type="button" disabled>Continue with Google</PrimaryButton>
      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-subtle-foreground"><ShieldCheck aria-hidden="true" size={15} />Google sign-in will be connected in the authentication phase.</p>
      <SecondaryButton className="mt-6 w-full" onClick={() => { signInPreview(); router.push("/profile"); }}>Preview signed-in UI</SecondaryButton>
      <p className="mt-3 text-xs leading-5 text-subtle-foreground">UI preview only. This does not create or authenticate an account.</p>
    </>
  );
}
