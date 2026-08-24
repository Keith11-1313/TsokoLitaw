import Image from "next/image";
import { cn } from "@/lib/cn";

interface BrandLockupProps {
  context?: "customer" | "admin";
  inverted?: boolean;
  showMark?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  titleClassName?: string;
  className?: string;
}

export function BrandLockup({
  context = "customer",
  inverted = false,
  showMark = true,
  showSubtitle = true,
  subtitle,
  titleClassName,
  className,
}: BrandLockupProps) {
  const resolvedSubtitle =
    subtitle ?? (context === "admin" ? "Admin panel" : "Artisanal dessert");

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      {showMark ? (
        <Image
          src="/brand/logo.png"
          alt=""
          width={48}
          height={48}
          sizes="48px"
          className="size-12 shrink-0 rounded-full object-contain"
          aria-hidden="true"
        />
      ) : null}
      <span className="flex flex-col">
        <span
          className={cn(
            "font-display text-2xl leading-none",
            inverted ? "text-surface" : "text-brand",
            titleClassName,
          )}
        >
          TsokoLitaw
        </span>
        {showSubtitle ? (
          <span
            className={cn(
              "mt-1 text-[0.625rem] font-bold uppercase tracking-wide",
              inverted ? "text-surface/75" : "text-muted-foreground",
            )}
          >
            {resolvedSubtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
