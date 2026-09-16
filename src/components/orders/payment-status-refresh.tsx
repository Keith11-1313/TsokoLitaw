"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PaymentDeadline({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  const expiresAtTime = Date.parse(expiresAt);

  useEffect(() => {
    const initialTimer = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, []);

  const minutesRemaining =
    now === null || !Number.isFinite(expiresAtTime)
      ? null
      : Math.max(0, Math.ceil((expiresAtTime - now) / 60_000));
  const deadline = new Date(expiresAt);
  const date = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(deadline);
  const time = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(deadline);

  return (
    <div className="mt-5 rounded-control bg-surface-muted px-4 py-3 text-center">
      <p className="font-bold text-brand" aria-live="polite">
        {minutesRemaining === null
          ? "Payment deadline"
          : minutesRemaining === 0
            ? "Payment time ended"
            : minutesRemaining === 1
              ? "Expires in 1 minute"
              : `Expires in ${minutesRemaining} minutes`}
      </p>
      <time dateTime={expiresAt} className="mt-1 block text-sm text-muted-foreground">
        {date} · {time}
      </time>
    </div>
  );
}

export function PaymentStatusRefresh({
  expiresAt,
  showControl = false,
}: {
  expiresAt?: string | null;
  showControl?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => router.refresh(), Math.min(remaining + 100, 2147483647));
    return () => clearTimeout(timer);
  }, [expiresAt, router]);
  return showControl ? (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          setRequested(true);
          startTransition(() => router.refresh());
        }}
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-brand px-5 text-sm font-bold text-brand disabled:opacity-50"
      >
        Check payment status
      </button>
      {requested ? (
        <p
          className="mt-2 text-center text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {pending ? "Checking payment status." : "Status checked. Payment is still under review."}
        </p>
      ) : null}
    </div>
  ) : null;
}
