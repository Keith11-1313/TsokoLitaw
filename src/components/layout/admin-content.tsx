import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function AdminContent({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn("min-w-0 flex-1 px-6 py-8 lg:px-12 lg:py-10", className)}
      {...props}
    />
  );
}
