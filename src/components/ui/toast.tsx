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
        "fixed right-4 top-4 z-[130] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-control border bg-surface px-4 py-3 text-sm shadow-xl sm:max-w-sm",
        tone === "error" ? "border-danger text-danger-foreground" : "border-border text-brand",
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
      <p className="min-w-0 flex-1 leading-5">{message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="flex size-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
