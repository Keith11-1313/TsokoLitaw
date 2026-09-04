import { cn } from "@/lib/cn";
import { formatPhp } from "@/lib/commerce";
import type { CustomerOrderItemSummary } from "@/lib/server-orders";

interface OrderLineItemsProps {
  items: CustomerOrderItemSummary[];
  className?: string;
}

export function OrderLineItems({ items, className }: OrderLineItemsProps) {
  if (!items.length) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Order items unavailable</p>;
  }

  return (
    <ul className={cn("divide-y divide-border", className)}>
      {items.map((item) => {
        const boxQuantity = `${item.quantity} ${item.quantity === 1 ? "box" : "boxes"}`;
        const contentsLabel = item.quantity === 1 ? "In this box" : "In each box";
        const unitTotal = item.quantity > 0 ? item.lineTotal / item.quantity : 0;

        return (
          <li key={item.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-bold leading-6 text-foreground">{item.name}</p>
              <p className="shrink-0 font-bold tabular-nums text-foreground">
                <span className="sr-only">Line total: </span>
                {formatPhp(item.lineTotal)}
              </p>
            </div>

            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              <p>
                {boxQuantity}<span aria-hidden="true"> × </span><span className="sr-only"> at </span>
                <span className="tabular-nums">{formatPhp(unitTotal)}</span>
                {item.quantity > 1 ? " each" : null}
              </p>

              {item.coatings.length ? (
                <div className="mt-3">
                  <p className="font-bold text-foreground">{contentsLabel}</p>
                  <p>{item.coatings.join(" · ")}</p>
                </div>
              ) : null}

              {item.addon ? (
                <div className="mt-2">
                  <p className="font-bold text-foreground">Add-on per box</p>
                  <p>{item.addon.name} × {item.addon.quantity}</p>
                </div>
              ) : null}

              <details className="group mt-3 border-t border-border/70 pt-3">
                <summary className="w-fit cursor-pointer rounded-sm font-bold text-foreground underline decoration-border underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
                  <span className="group-open:hidden">View price per box</span>
                  <span className="hidden group-open:inline">Hide price per box</span>
                </summary>
                <dl className="mt-1 space-y-1">
                  <div className="flex justify-between gap-4">
                    <dt>Base box</dt>
                    <dd className="shrink-0 tabular-nums">{formatPhp(item.basePrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Coatings</dt>
                    <dd className="shrink-0 tabular-nums">{formatPhp(item.coatingTotal)}</dd>
                  </div>
                  {item.addon ? (
                    <div className="flex justify-between gap-4">
                      <dt>Add-on</dt>
                      <dd className="shrink-0 tabular-nums">{formatPhp(item.addon.lineTotal)}</dd>
                    </div>
                  ) : null}
                </dl>
              </details>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
