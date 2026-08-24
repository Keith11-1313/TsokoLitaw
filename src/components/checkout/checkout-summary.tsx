import { CatalogImagePlaceholder } from "@/components/creations/catalog-image-placeholder";

export function CheckoutSummary() {
  return (
    <aside className="rounded-card border border-border bg-surface p-6 lg:sticky lg:top-6">
      <h2 className="font-display text-2xl">Order summary</h2>
      <div className="mt-6 flex gap-4 border-b border-border pb-6">
        <div className="w-20 shrink-0">
          <CatalogImagePlaceholder label="Choco Litaw" tone="chocolate" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-3">
            <h3 className="font-display text-lg">Choco Litaw</h3>
            <p className="font-bold">₱180.00</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Box of 6 · Toasted sesame · Extra chocolate sauce
          </p>
          <p className="mt-2 text-xs font-bold text-subtle-foreground">Qty 1</p>
        </div>
      </div>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>Subtotal</dt><dd>₱180.00</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>Extra sauce</dt><dd>₱18.00</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-4 text-base font-bold text-foreground">
          <dt>Total</dt><dd>₱198.00</dd>
        </div>
      </dl>
      <p className="mt-6 rounded-control bg-warning-background px-4 py-3 text-xs leading-5 text-warning-foreground">
        Mock checkout only. Prices, inventory, promotions, and payment will be
        verified server-side in a later phase.
      </p>
    </aside>
  );
}
