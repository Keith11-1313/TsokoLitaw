"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { AddToCartModal } from "@/components/creations/add-to-cart-modal";
import { calculateConfiguredExtraCoatingCharge, calculateItemUnitTotal, formatPhp, hasCompleteCoatingAllocation } from "@/lib/commerce";
import { PrimaryButton } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/cn";
import type { CommerceCatalog } from "@/types/commerce";

export function ProductConfigurator({ catalog }: { catalog: CommerceCatalog }) {
  const { variants, coatings, addons } = catalog;
  const extraSauceAddon = addons.find((addon) => addon.slug === "extra-sea-salt-cream") ?? null;
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(variants[0].id);
  const [mode, setMode] = useState<"single" | "mixed">("single");
  const [singleCoating, setSingleCoating] = useState(coatings[0].id);
  const [counts, setCounts] = useState<Record<string, number>>({ [coatings[0].id]: variants[0].pieceCount });
  const [quantity, setQuantity] = useState("1");
  const [extraSauce, setExtraSauce] = useState("0");
  const [addedItem, setAddedItem] = useState<{
    variantLabel: string;
    quantity: number;
    total: number;
  } | null>(null);

  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  const selectedCoating = coatings.find((coating) => coating.id === singleCoating) ?? coatings[0];
  const mixedTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const extraCoatingCharge = calculateConfiguredExtraCoatingCharge(
    mode === "single" ? { [singleCoating]: variant.pieceCount } : counts,
    coatings,
  );
  const extraSaucePrice = extraSauceAddon?.price ?? 0;
  const unitTotal = calculateItemUnitTotal(variant.price, extraCoatingCharge, Number(extraSauce), extraSaucePrice);
  const remainingPieces = variant.pieceCount - mixedTotal;
  const hasValidAllocation = mode === "single" || hasCompleteCoatingAllocation(variant.pieceCount, counts);
  const error = !hasValidAllocation ? `Assign ${remainingPieces} more ${remainingPieces === 1 ? "piece" : "pieces"}.` : "";
  const coatingNames = useMemo(() => Object.fromEntries(coatings.map((coating) => [coating.id, coating.name])), [coatings]);
  function closeAddedItem() {
    setAddedItem(null);
  }

  function changeVariant(value: string) {
    const next = variants.find((item) => item.id === value) ?? variants[0];
    setVariantId(next.id);
    setCounts({ [singleCoating]: next.pieceCount });
  }

  function changeMode(value: "single" | "mixed") {
    setMode(value);
    setCounts(value === "mixed" ? {} : { [singleCoating]: variant.pieceCount });
  }

  function chooseSingle(id: string) {
    setSingleCoating(id);
    setCounts({ [id]: variant.pieceCount });
  }

  function adjust(id: string, delta: number) {
    setCounts((current) => {
      const total = Object.values(current).reduce((sum, count) => sum + count, 0);
      if (delta > 0 && total >= variant.pieceCount) return current;
      return { ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) };
    });
  }

  function submit() {
    if (error) return;
    const coatingCounts = mode === "single" ? { [singleCoating]: variant.pieceCount } : counts;
    const selectedQuantity = Number(quantity);
    addItem({ variantId: variant.id, pieceCount: variant.pieceCount, boxPrice: variant.price, coatingCounts, coatingNames, extraCoatingCharge, extraSauceAddonId: extraSauceAddon?.id ?? null, extraSauceQuantity: Number(extraSauce), extraSaucePrice, quantity: selectedQuantity });
    setAddedItem({
      variantLabel: variant.label,
      quantity: selectedQuantity,
      total: unitTotal * selectedQuantity,
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section className="order-2 min-w-0 lg:order-1" aria-labelledby="coatings-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="coatings-heading" className="font-display text-3xl">Choose your coating</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Select one finish or allocate a mixed box piece by piece.</p>
          </div>
          <p className="text-xs font-bold text-subtle-foreground">{coatings.length} choices</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coatings.map((coating, index) => {
            const count = counts[coating.id] ?? 0;
            const selected = mode === "single" ? coating.id === singleCoating : count > 0;
            const cardContent = <><div className="relative aspect-[4/3] overflow-hidden bg-surface-muted"><Image src={coating.imageSrc} alt={`${coating.name} coated chocolate-filled Litaw`} fill sizes="(min-width: 1280px) 18vw, (min-width: 640px) 35vw, 90vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />{selected ? <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-brand text-surface shadow"><Check aria-hidden="true" size={17} /></span> : null}</div><div className="p-4"><h3 className="font-display text-xl">{coating.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">{coating.description}</p></div></>;

            return <article key={coating.id} className={cn("group overflow-hidden rounded-card border bg-surface transition", selected ? "border-brand ring-2 ring-brand/15" : "border-border", index === coatings.length - 1 && "sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.5rem)] xl:col-span-1 xl:col-start-2 xl:w-full")}>
              {mode === "single" ? <button type="button" aria-pressed={selected} onClick={() => chooseSingle(coating.id)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">{cardContent}</button> : <>{cardContent}<div className="flex items-center justify-between border-t border-border px-4 py-3"><span className="text-xs font-bold text-muted-foreground">Pieces</span><div className="flex items-center gap-2"><button type="button" aria-label={`Remove one ${coating.name}`} disabled={count === 0} onClick={() => adjust(coating.id, -1)} className="flex size-10 items-center justify-center rounded-full bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-35"><Minus aria-hidden="true" size={15} /></button><span className="w-5 text-center font-bold">{count}</span><button type="button" aria-label={`Add one ${coating.name}`} disabled={mixedTotal >= variant.pieceCount} onClick={() => adjust(coating.id, 1)} className="flex size-10 items-center justify-center rounded-full bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-35"><Plus aria-hidden="true" size={15} /></button></div></div></>}
            </article>;
          })}
        </div>
      </section>

      <aside className="order-1 self-start lg:order-2 lg:sticky lg:top-6">
        <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-7" aria-labelledby="build-box-heading">
          <h2 id="build-box-heading" className="font-display text-3xl">Build your box</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">One coating type is included. Each additional type uses its current Admin-configured catalog price.</p>

          <div className="mt-6 space-y-5">
            <CustomSelect label="Box size" value={variantId} onChange={changeVariant} options={variants.map((item) => ({ value: item.id, label: `${item.label} — ${formatPhp(item.price)}` }))} />

            <fieldset>
              <legend className="text-sm font-bold">Coating style</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">{(["single", "mixed"] as const).map((value) => <button type="button" key={value} onClick={() => changeMode(value)} className={cn("min-h-12 rounded-control border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus", mode === value ? "border-brand bg-brand text-surface" : "border-border bg-surface")}>{value === "single" ? "Single coating" : "Mixed box"}</button>)}</div>
            </fieldset>

            <div className="rounded-control bg-surface-control p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-subtle-foreground">Your coating</p>{mode === "mixed" ? <span className={cn("text-xs font-bold", error ? "text-danger-foreground" : "text-success-foreground")}>{mixedTotal}/{variant.pieceCount} pieces</span> : null}</div>
              {mode === "single" ? <p className="mt-2 font-bold">{selectedCoating.name}</p> : <div className="mt-3 flex flex-wrap gap-2">{coatings.filter((coating) => (counts[coating.id] ?? 0) > 0).map((coating) => <span key={coating.id} className="rounded-full bg-surface px-3 py-1 text-xs font-bold">{coating.name} × {counts[coating.id]}</span>)}</div>}
              {error ? <p className="mt-2 text-xs font-bold text-danger-foreground">{error}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><CustomSelect label={extraSauceAddon?.name ?? "Extra add-on"} value={extraSauce} onChange={setExtraSauce} options={(extraSauceAddon ? [0,1,2,3] : [0]).map((count) => ({ value: String(count), label: count === 0 ? "No extra cup" : `${count} extra ${count === 1 ? "cup" : "cups"}` }))} /><CustomSelect label="Quantity" value={quantity} onChange={setQuantity} options={[1,2,3,4,5].map((count) => ({ value: String(count), label: String(count) }))} /></div>

            <div className="flex items-center justify-between border-t border-border pt-5"><span className="font-bold">Item total</span><strong className="font-display text-2xl">{formatPhp(unitTotal * Number(quantity))}</strong></div>
            <PrimaryButton type="button" disabled={Boolean(error)} onClick={submit} className="w-full rounded-control! text-base"><ShoppingBag size={18} />Add to cart</PrimaryButton>
          </div>
        </section>
      </aside>
      {addedItem ? (
        <AddToCartModal
          variantLabel={addedItem.variantLabel}
          quantity={addedItem.quantity}
          total={addedItem.total}
          onClose={closeAddedItem}
        />
      ) : null}
    </div>
  );
}
