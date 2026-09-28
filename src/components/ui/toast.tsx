"use client";

import { useEffect } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string;
  tone?: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const Icon = tone === "success" ? CheckCircle2 : CircleAlert;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "fixed right-4 top-4 z-[130] flex min-h-14 w-[calc(100vw-2rem)] max-w-sm items-center gap-3 rounded-control border px-4 py-2 text-sm shadow-xl sm:right-6 sm:top-6",
        tone === "error"
          ? "border-danger-foreground/25 bg-danger-background text-danger-foreground"
          : "border-success-foreground/25 bg-success-background text-success-foreground",
      )}
    >
      <Icon aria-hidden="true" className="shrink-0" size={20} />
      <p className="min-w-0 flex-1 font-bold leading-5">{message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
