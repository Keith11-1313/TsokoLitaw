import { ImageOff, Play } from "lucide-react";
import { cn } from "@/lib/cn";

interface DessertPlaceholderProps {
  variant: "hero" | "featured";
  className?: string;
}

const mochi = [
  "left-[16%] top-[43%] bg-[#eed8b0]",
  "left-[34%] top-[22%] bg-[#e5cf9c]",
  "left-[50%] top-[48%] bg-[#f3e2bd]",
  "left-[66%] top-[25%] bg-[#e7c980]",
] as const;

export function DessertPlaceholder({
  variant,
  className,
}: DessertPlaceholderProps) {
  const isFeatured = variant === "featured";
  const label = isFeatured
    ? "Featured TsokoLitaw video placeholder"
    : "TsokoLitaw product image placeholder";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-card bg-[#d7b994]",
        isFeatured ? "aspect-[4/3] sm:aspect-[16/8] lg:aspect-[64/25]" : "aspect-[5/4]",
        className,
      )}
      role="img"
      aria-label={label}
    >
      <div
        className={cn(
          "absolute inset-0",
          isFeatured
            ? "bg-[radial-gradient(circle_at_50%_20%,#8d6a49_0%,#4f3524_50%,#241912_100%)]"
            : "bg-[radial-gradient(circle_at_55%_25%,#ead5b8_0%,#d5b38d_58%,#c29a73_100%)]",
        )}
      />

      {isFeatured ? (
        <div className="absolute inset-x-[8%] bottom-[8%] top-[20%] rounded-[50%] bg-[#1d1916] shadow-2xl shadow-black/45" />
      ) : null}

      <div className={cn("absolute inset-0", isFeatured && "scale-110")}>
        {mochi.map((position, index) => (
          <span
            key={position}
            className={cn(
              "absolute aspect-square w-[26%] rounded-full shadow-[inset_-12px_-16px_24px_rgba(116,75,35,0.15),0_16px_24px_rgba(41,24,11,0.24)]",
              position,
              isFeatured && index === 0 && "bg-[#dba783]",
              isFeatured && index === 1 && "bg-[#a5b77a]",
              isFeatured && index === 2 && "bg-[#eee0bb]",
              isFeatured && index === 3 && "bg-[#e4c36e]",
            )}
            aria-hidden="true"
          >
            <span className="absolute left-1/2 top-[8%] h-[10%] w-[58%] -translate-x-1/2 rounded-full bg-white/55 blur-[1px]" />
          </span>
        ))}
      </div>

      {isFeatured ? (
        <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-brand shadow-lg sm:size-16">
          <Play aria-hidden="true" className="ml-1" fill="currentColor" size={24} />
          <span className="sr-only">Video placeholder</span>
        </span>
      ) : null}

      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-surface/85 px-3 py-1.5 text-[0.6875rem] font-bold text-brand backdrop-blur-sm">
        <ImageOff aria-hidden="true" size={13} />
        Placeholder
      </span>
    </div>
  );
}
