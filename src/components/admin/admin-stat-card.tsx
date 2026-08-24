import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface AdminStatCardProps {
  label: string;
  value: string;
  supportingText?: string;
  icon?: LucideIcon;
  accentClassName?: string;
  compact?: boolean;
}

export function AdminStatCard({
  label,
  value,
  supportingText,
  icon: Icon,
  accentClassName,
  compact = false,
}: AdminStatCardProps) {
  return (
    <article
      className={cn(
        "rounded-card border border-border bg-surface",
        compact ? "h-[5.875rem] px-5 py-4" : "min-h-[9.4375rem] p-6",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              "text-xs font-bold uppercase text-muted-foreground",
              accentClassName,
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "font-display text-[1.875rem] leading-tight text-foreground",
              compact && "mt-1 text-[1.75rem]",
              accentClassName,
            )}
          >
            {value}
          </p>
        </div>
        {Icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand">
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          </span>
        ) : null}
      </div>
      {supportingText ? (
        <p className="mt-1 text-xs text-subtle-foreground">{supportingText}</p>
      ) : null}
    </article>
  );
}
