"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PaymentStatusRefresh({
  expiresAt,
  showControl = false,
}: {
  expiresAt?: string | null;
  showControl?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => router.refresh(), Math.min(remaining + 100, 2147483647));
    return () => clearTimeout(timer);
  }, [expiresAt, router]);
  return showControl ? (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-5 text-sm font-bold text-brand disabled:opacity-50"
    >
      Check payment status
    </button>
  ) : null;
}
