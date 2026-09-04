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
        const coatingsLabel = item.quantity === 1
          ? "Coatings in this box"
          : "Coatings in each box";

        return (
          <li key={item.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold leading-6 text-foreground">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{boxQuantity}</p>
              </div>
              <p className="shrink-0 font-bold tabular-nums text-foreground">
                <span className="sr-only">Line total: </span>
                {formatPhp(item.lineTotal)}
              </p>
            </div>

            {item.coatings.length || item.addon ? (
              <dl className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                {item.coatings.length ? (
                  <div>
                    <dt className="inline font-bold text-foreground">{coatingsLabel}:</dt>{" "}
                    <dd className="inline">{item.coatings.join(" · ")}</dd>
                  </div>
                ) : null}
                {item.addon ? (
                  <div>
                    <dt className="inline font-bold text-foreground">Add-on per box:</dt>{" "}
                    <dd className="inline">{item.addon.name} × {item.addon.quantity}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
