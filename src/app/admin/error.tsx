"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section
        className="w-full max-w-xl rounded-card border border-border bg-surface p-8 text-center"
        aria-labelledby="admin-error-heading"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-background text-danger-foreground">
          <AlertTriangle aria-hidden="true" />
        </span>
        <h1 id="admin-error-heading" className="mt-5 font-display text-3xl text-foreground">
          Admin data is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The dashboard did not receive a complete, trustworthy response. No missing value has been
          replaced with a fake zero.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <RotateCcw aria-hidden="true" size={17} />
          Try again
        </button>
      </section>
    </main>
  );
}
