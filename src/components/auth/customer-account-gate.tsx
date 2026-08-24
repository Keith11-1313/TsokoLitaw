"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthPreview } from "@/components/auth/auth-preview-provider";

export function CustomerAccountGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isReady, isSignedIn } = useAuthPreview();

  useEffect(() => {
    if (isReady && !isSignedIn) router.replace("/login");
  }, [isReady, isSignedIn, router]);

  if (!isReady) {
    return <p role="status" className="py-16 text-center text-sm text-muted-foreground">Checking your account…</p>;
  }

  if (!isSignedIn) {
    return <p role="status" className="py-16 text-center text-sm text-muted-foreground">Taking you to sign in…</p>;
  }

  return children;
}
