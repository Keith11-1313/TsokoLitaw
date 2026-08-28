import Image from "next/image";
import { cn } from "@/lib/cn";

interface DessertPlaceholderProps {
  variant: "hero" | "featured";
  className?: string;
}

export function DessertPlaceholder({
  variant,
  className,
}: DessertPlaceholderProps) {
  const isFeatured = variant === "featured";
  const label = isFeatured
    ? "TsokoLitaw featured media artwork"
    : "TsokoLitaw product artwork";
  const source = isFeatured
    ? "/images/home/placeholder-landscape-16x9.jpg"
    : "/images/home/placeholder-landscape-4x3.jpg";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card bg-surface-muted",
        isFeatured ? "aspect-video" : "aspect-[4/3]",
        className,
      )}
    >
      <Image
        src={source}
        alt={label}
        fill
        sizes={
          isFeatured
            ? "(min-width: 1024px) 64rem, calc(100vw - 2rem)"
            : "(min-width: 768px) 42rem, calc(100vw - 2rem)"
        }
        className="object-cover"
      />
    </div>
  );
}
