import { OrderLineItems } from "@/components/orders/order-line-items";
import { calculateCartLineTotal, formatPhp } from "@/lib/commerce";
import type { CartLineItem } from "@/types/commerce";

interface CheckoutOrderSummaryProps {
  selectedItems: readonly CartLineItem[];
  rewardDiscount: number;
  checkoutTotal: number;
}

// Presentation-only estimates. Authoritative checkout pricing stays on the server.
export function CheckoutOrderSummary({
  selectedItems,
  rewardDiscount,
  checkoutTotal,
}: CheckoutOrderSummaryProps) {
  const orderSummaryItems = selectedItems.map((item) => ({
    id: item.id,
    name: item.variantLabel,
    quantity: item.quantity,
    lineTotal: calculateCartLineTotal(item),
    basePrice: item.boxPrice,
    coatingTotal: item.extraCoatingCharge,
    coatings: Object.entries(item.coatingCounts)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => `${item.coatingNames[id] ?? "Coating"} × ${count}`),
    addon:
      item.addonQuantity > 0
        ? {
            name: item.addonName ?? "Add-on",
            quantity: item.addonQuantity,
            lineTotal: item.addonPrice * item.addonQuantity,
          }
        : null,
  }));

  return (
    <aside className="order-1 min-w-0 overflow-hidden rounded-card border border-border bg-surface lg:order-2 lg:sticky lg:top-6">
      <div className="border-b border-border bg-surface-muted px-6 py-5">
        <h2 className="font-display text-3xl">Order summary</h2>
      </div>
      <div className="px-6 py-5">
        <OrderLineItems items={orderSummaryItems} />
      </div>
      <div className="border-t border-border bg-surface-muted px-6 py-5">
        <div className="space-y-2 text-sm">
          {rewardDiscount > 0 ? (
            <div className="flex justify-between gap-4 font-bold text-success-foreground">
              <span>Loyalty reward</span>
              <span>−{formatPhp(rewardDiscount)}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <strong className="font-display text-3xl text-brand">{formatPhp(checkoutTotal)}</strong>
        </div>
      </div>
    </aside>
  );
}
