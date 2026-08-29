import { Gift } from "lucide-react";
import type { CustomerLoyaltyStatus } from "@/lib/server-loyalty";

export function LoyaltyProgressCard({ loyalty }: { loyalty: CustomerLoyaltyStatus }) {
  const percentage = Math.min((loyalty.progress / loyalty.threshold) * 100, 100);
  const remaining = loyalty.threshold - loyalty.progress;

  return (
    <section className="rounded-card border border-border bg-surface p-6" aria-labelledby="loyalty-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="loyalty-title" className="font-display text-xl">Loyalty progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">Completed pickups only</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand">
          <Gift aria-hidden="true" size={19} />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <strong className="font-display text-3xl">{loyalty.progress}/{loyalty.threshold}</strong>
        <span className="text-xs text-muted-foreground">{loyalty.completedOrderCount} completed total</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-label={`${loyalty.progress} of ${loyalty.threshold} completed orders toward the next reward`}>
        <span className="block h-full rounded-full bg-success-foreground" style={{ width: `${percentage}%` }} />
      </div>

      {loyalty.availableRewards.length ? (
        <p className="mt-4 rounded-control bg-success-background p-3 text-sm font-bold text-success-foreground">
          {loyalty.availableRewards.length} free 4-piece {loyalty.availableRewards.length === 1 ? "box" : "boxes"} ready to use
        </p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {remaining} more completed {remaining === 1 ? "order" : "orders"} until your next free 4-piece box.
        </p>
      )}
    </section>
  );
}
