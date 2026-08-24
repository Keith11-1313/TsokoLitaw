import { ImageOff } from "lucide-react";
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
        "flex aspect-square items-center justify-center rounded-image bg-surface-muted text-subtle-foreground",
        className,
      )}
      role="img"
      aria-label={label}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center text-sm">
        <ImageOff aria-hidden="true" size={24} strokeWidth={1.75} />
        <span>{label}</span>
      </div>
    </div>
  );
}
