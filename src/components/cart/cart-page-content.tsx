"use client";

import { ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityInput } from "@/components/ui/quantity-input";
import { calculateItemUnitTotal, formatPhp, MAX_CART_LINE_QUANTITY } from "@/lib/commerce";
import {
  PrimaryButton,
  SecondaryButton,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useEditorDialog } from "@/hooks/use-editor-dialog";

function RemoveCartItemDialog({
  label,
  onClose,
  onConfirm,
}: {
  label: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { dialogRef, requestClose } = useEditorDialog({
    isDirty: false,
    pending: false,
    onClose,
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/50 p-4"
      onPointerDown={requestClose}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-cart-item-title"
        aria-describedby="remove-cart-item-description"
        onPointerDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="remove-cart-item-title" className="font-display text-2xl text-foreground">
            Remove this box?
          </h2>
          <button
            type="button"
            aria-label="Close remove box confirmation"
            onClick={requestClose}
            className="flex size-11 shrink-0 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <p
          id="remove-cart-item-description"
          className="mt-3 text-sm leading-6 text-muted-foreground"
        >
          {label} will be removed from your cart. You can build it again later.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SecondaryButton type="button" autoFocus onClick={requestClose}>
            Keep box
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={onConfirm}
            className="bg-danger-foreground text-surface hover:bg-danger-foreground/90"
          >
            <Trash2 aria-hidden="true" size={17} />
            Remove box
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

export function CartPageContent() {
  const [itemToRemoveId, setItemToRemoveId] = useState<string | null>(null);
  const {
    isReady,
    items,
    selectedItemIds,
    selectedSubtotal,
    updateQuantity,
    removeItem,
    setItemSelected,
    setAllItemsSelected,
  } = useCart();
  const itemToRemove = items.find((item) => item.id === itemToRemoveId);

  function confirmRemove() {
    if (!itemToRemove) return;
    removeItem(itemToRemove.id);
    setItemToRemoveId(null);
    window.requestAnimationFrame(() => document.getElementById("cart-heading")?.focus());
  }

  if (!isReady)
    return (
      <section
        role="status"
        aria-live="polite"
        className="rounded-card border border-border bg-surface px-6 py-16 text-center"
      >
        <ShoppingBag className="mx-auto text-brand" size={42} aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl">Loading your cart…</h1>
      </section>
    );
  if (items.length === 0)
    return (
      <section className="rounded-card border border-border bg-surface px-6 py-16 text-center">
        <ShoppingBag className="mx-auto text-brand" size={42} />
        <h1 id="cart-heading" tabIndex={-1} className="mt-5 font-display text-3xl">
          Your cart is empty
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Build a box and it will wait here for checkout.
        </p>
        <Link href="/our-creations" className={cn(primaryButtonClassName, "mt-7")}>
          Build a box
        </Link>
      </section>
    );

  const allSelected = items.length > 0 && selectedItemIds.length === items.length;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 id="cart-heading" tabIndex={-1} className="font-display text-4xl">
          Your cart
        </h1>
        <label className="mt-6 flex min-h-11 items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => setAllItemsSelected(event.target.checked)}
            className="size-5 accent-brand disabled:opacity-50"
          />
          Select all ({selectedItemIds.length}/{items.length})
        </label>
        <div className="mt-4 space-y-4">
          {items.map((item) => {
            const unitTotal = calculateItemUnitTotal(
              item.boxPrice,
              item.extraCoatingCharge,
              item.addonQuantity,
              item.addonPrice,
            );
            const coatings = Object.entries(item.coatingCounts)
              .filter(([, count]) => count > 0)
              .map(([id, count]) => `${item.coatingNames[id]} × ${count}`)
              .join(", ");
            const selected = selectedItemIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-card border bg-surface p-5 transition sm:p-6",
                  selected ? "border-brand ring-2 ring-brand/10" : "border-border",
                )}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => setItemSelected(item.id, event.target.checked)}
                    aria-label={`Select ${item.variantLabel} for checkout`}
                    className="mt-1 size-5 shrink-0 accent-brand disabled:opacity-50"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-subtle-foreground">
                          {item.variantLabel}
                        </p>
                        <h2 className="mt-1 font-display text-2xl">Chocolate Litaw box</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{coatings}</p>
                        <p className="mt-1 text-sm text-success-foreground">
                          Complimentary {item.complimentaryAddonName} × {item.quantity} —{" "}
                          {formatPhp(0)}
                        </p>
                        {item.addonQuantity && item.addonName ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Additional {item.addonName} × {item.addonQuantity} per box
                          </p>
                        ) : null}
                      </div>
                      <strong className="font-display text-xl">
                        {formatPhp(unitTotal * item.quantity)}
                      </strong>
                    </div>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
                      <QuantityInput
                        label="Box quantity"
                        value={item.quantity}
                        onChange={(quantity) => updateQuantity(item.id, quantity)}
                        min={1}
                        max={MAX_CART_LINE_QUANTITY}
                        className="w-40"
                      />
                      <button
                        type="button"
                        onClick={() => setItemToRemoveId(item.id)}
                        aria-label={`Remove ${item.variantLabel} from cart`}
                        className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-danger-foreground hover:bg-danger-background disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={17} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="rounded-card border border-border bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="font-display text-2xl">Checkout summary</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Selected items</dt>
            <dd>{selectedItemIds.length}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-4 text-lg font-bold">
            <dt>Selected total</dt>
            <dd>{formatPhp(selectedSubtotal)}</dd>
          </div>
        </dl>
        {selectedItemIds.length ? (
          <Link href="/checkout" className={cn(primaryButtonClassName, "mt-6 w-full")}>
            Checkout selected items
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(primaryButtonClassName, "mt-6 w-full cursor-not-allowed opacity-45")}
          >
            Select an item to checkout
          </span>
        )}
        <Link href="/our-creations" className={cn(secondaryButtonClassName, "mt-3 w-full")}>
          Continue shopping
        </Link>
      </aside>
      {itemToRemove ? (
        <RemoveCartItemDialog
          label={itemToRemove.variantLabel}
          onClose={() => setItemToRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}
