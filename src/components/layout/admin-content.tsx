import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function AdminContent({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn(
        "mx-auto min-w-0 w-full max-w-[var(--container-admin)] flex-1 px-5 py-7 sm:px-8 sm:py-9 lg:px-10 xl:px-12",
        className,
      )}
      {...props}
    />
  );
}
