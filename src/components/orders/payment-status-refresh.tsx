"use client";
import { useEffect, useState } from "react";

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
