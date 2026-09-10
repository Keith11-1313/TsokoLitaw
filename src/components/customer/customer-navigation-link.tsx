"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

function NavigationPendingState({ onChange }: { onChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);

  return null;
}

export function CustomerNavigationLink({
  children,
  className,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      {...props}
      aria-disabled={pending || props["aria-disabled"]}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "relative aria-disabled:cursor-not-allowed aria-disabled:bg-stone-200! aria-disabled:text-stone-600! aria-disabled:opacity-70 aria-disabled:shadow-inner aria-disabled:grayscale",
        className,
      )}
    >
      {children}
      <NavigationPendingState onChange={setPending} />
    </Link>
  );
}
