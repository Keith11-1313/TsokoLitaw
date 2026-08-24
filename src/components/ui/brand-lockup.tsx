import { cn } from "@/lib/cn";

interface BrandLockupProps {
  context?: "customer" | "admin";
  inverted?: boolean;
  showMark?: boolean;
  className?: string;
}

export function BrandLockup({
  context = "customer",
  inverted = false,
  showMark = true,
  className,
}: BrandLockupProps) {
  const subtitle = context === "admin" ? "Admin panel" : "Artisanal dessert";

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      {showMark ? (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg",
            inverted ? "bg-surface text-brand" : "bg-brand text-surface",
          )}
          aria-hidden="true"
        >
          TL
        </span>
      ) : null}
      <span className="flex flex-col">
        <span
          className={cn(
            "font-display text-2xl leading-none",
            inverted ? "text-surface" : "text-brand",
          )}
        >
          TsokoLitaw
        </span>
        <span
          className={cn(
            "mt-1 text-[0.625rem] font-bold uppercase tracking-wide",
            inverted ? "text-surface/75" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      </span>
    </div>
  );
}
