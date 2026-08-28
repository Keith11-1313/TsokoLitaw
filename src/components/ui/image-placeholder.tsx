import Image from "next/image";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ImagePlaceholderProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function ImagePlaceholder({
  className,
  label = "Product image coming soon",
  ...props
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-image bg-surface-muted",
        className,
      )}
      {...props}
    >
      <Image
        src="/images/home/placeholder-square.jpg"
        alt={label}
        fill
        sizes="(min-width: 768px) 20rem, calc(100vw - 2rem)"
        className="object-cover"
      />
    </div>
  );
}
