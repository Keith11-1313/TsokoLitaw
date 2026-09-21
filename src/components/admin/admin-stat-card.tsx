import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface AdminStatCardProps {
  label: string;
  value: string;
  supportingText?: string;
  icon?: LucideIcon;
  accentClassName?: string;
  compact?: boolean;
  href?: string;
  trend?: "positive" | "negative" | "neutral";
}

export function AdminStatCard({
  label,
  value,
  supportingText,
  icon: Icon,
  accentClassName,
  compact = false,
  href,
  trend = "neutral",
}: AdminStatCardProps) {
  const TrendIcon =
    trend === "positive" ? ArrowUpRight : trend === "negative" ? ArrowDownRight : Minus;
  const card = (
    <article
      className={cn(
        "rounded-card border border-border bg-surface",
        compact ? "px-4 py-3 sm:min-h-[6.25rem] sm:px-5 sm:py-4" : "min-h-[9.4375rem] p-6",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-xs font-bold uppercase text-muted-foreground", accentClassName)}>
            {label}
          </p>
          <p
            className={cn(
              "font-display text-[1.875rem] leading-tight text-foreground",
              compact && "mt-1 text-[clamp(1.25rem,4vw,1.75rem)]",
              accentClassName,
            )}
          >
            {value}
          </p>
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand",
              compact && "hidden sm:flex",
            )}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          </span>
        ) : null}
      </div>
      {supportingText ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs text-subtle-foreground",
            trend === "positive" && "text-success-foreground",
            trend === "negative" && "text-danger-foreground",
          )}
        >
          <TrendIcon aria-hidden="true" size={14} />
          {supportingText}
        </p>
      ) : null}
    </article>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
