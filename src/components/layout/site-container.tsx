import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SiteContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[90rem] px-4 sm:px-8 lg:px-12 xl:px-20",
        className,
      )}
      {...props}
    />
  );
}
