"use client";

import { CircleHelp } from "lucide-react";

export function InfoHint({ label, children }: { label: string; children: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <CircleHelp aria-hidden="true" size={15} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-control bg-foreground px-3 py-2 text-left text-xs font-normal leading-5 text-surface shadow-lg group-hover:block group-focus-within:block"
      >
        {children}
      </span>
    </span>
  );
}
