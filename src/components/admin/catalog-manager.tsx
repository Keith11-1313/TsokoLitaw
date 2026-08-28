"use client";

import { useActionState, useEffect, useState, useTransition, type ChangeEvent } from "react";
import { ImagePlus, Pencil, Plus, X } from "lucide-react";
import { saveAddonAction, saveCoatingAction, saveProductAction, saveVariantAction, type CatalogActionState } from "@/app/admin/products/actions";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { formatPhp } from "@/lib/commerce";
import type { AdminCatalogAddon, AdminCatalogCoating, AdminCatalogProduct } from "@/lib/server-catalog";

const initialState: CatalogActionState = { status: "idle", message: "" };

function ActionMessage({ state }: { state: CatalogActionState }) {
  if (state.status === "idle") return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`rounded-control p-3 text-sm font-bold ${state.status === "error" ? "bg-danger-background text-danger-foreground" : "bg-success-background text-success-foreground"}`}>{state.message}</p>;
}

function ProductSettings({ product }: { product: AdminCatalogProduct }) {
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  return <form action={action} className="rounded-card border border-border bg-surface p-6">
    <input type="hidden" name="productId" value={product.id} />
    <h2 className="font-display text-2xl">Product pricing</h2>
    <p className="mt-1 text-sm text-muted-foreground">One per-piece price calculates every active box total. Checkout reloads this value from the server.</p>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      <FormField id="catalog-piece-price" label="Price per piece (PHP)" required inputProps={{ name: "pricePerPiece", type: "number", min: 0, max: 10000, step: "0.01", defaultValue: product.pricePerPiece }} />
      <label className="flex min-h-11 items-center gap-3 self-end rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4 accent-brand" />Available to customers</label>
      <FormField id="catalog-product-description" label="Product description" required as="textarea" className="sm:col-span-2" textareaProps={{ name: "description", minLength: 10, maxLength: 500, defaultValue: product.description }} />
    </div>
    <div className="mt-5 space-y-3"><ActionMessage state={state} /><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save product settings"}</PrimaryButton></div>
  </form>;
}

function VariantCard({ variant, piecePrice }: { variant: AdminCatalogProduct["variants"][number]; piecePrice: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<CatalogActionState>(initialState);
  return <article className="rounded-card border border-border bg-surface p-5">
    <div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-xl">{variant.name}</h3><p className="mt-1 text-sm text-muted-foreground">{variant.pieceCount} × {formatPhp(piecePrice)} = <strong className="text-foreground">{formatPhp(variant.pieceCount * piecePrice)}</strong></p></div><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${variant.isActive ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{variant.isActive ? "Available" : "Hidden"}</span></div>
    <SecondaryButton className="mt-5 w-full" disabled={pending} onClick={() => startTransition(async () => setMessage(await saveVariantAction({ variantId: variant.id, isActive: !variant.isActive })))}>{pending ? "Saving…" : variant.isActive ? "Hide box size" : "Make available"}</SecondaryButton>
    <div className="mt-3"><ActionMessage state={message} /></div>
  </article>;
}

function readSquareImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      const url = String(reader.result); const image = new window.Image();
      image.onerror = () => reject(new Error("Choose a valid image."));
      image.onload = () => image.naturalWidth === image.naturalHeight ? resolve(url) : reject(new Error(`Use a square 1:1 image. This file is ${image.naturalWidth} × ${image.naturalHeight}px.`));
      image.src = url;
    };
    reader.readAsDataURL(file);
  });
}

function CoatingEditor({ coating, onClose }: { coating: AdminCatalogCoating | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveCoatingAction, initialState);
  const [preview, setPreview] = useState(coating?.imageUrl ?? "");
  const [imageError, setImageError] = useState("");
  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);
  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; setImageError("");
    if (!file) return;
    try { setPreview(await readSquareImage(file)); } catch (error) { setImageError(error instanceof Error ? error.message : "Choose a valid square image."); event.target.value = ""; }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={() => !pending && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="coating-editor-title" onPointerDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-2xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Catalog coating</p><h2 id="coating-editor-title" className="mt-1 font-display text-3xl">{coating ? "Edit coating" : "Add coating"}</h2></div><button type="button" aria-label="Close coating editor" disabled={pending} onClick={onClose} className="flex size-11 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" /></button></div>
      <form action={action} className="mt-6 grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="coatingId" value={coating?.id ?? ""} /><input type="hidden" name="existingImageUrl" value={coating?.imageUrl ?? ""} />
        <FormField id="coating-name" label="Name" required inputProps={{ name: "name", defaultValue: coating?.name, minLength: 2, maxLength: 80, autoFocus: true }} />
        <FormField id="coating-price" label="Additional type price (PHP)" hint="The first coating type remains included." required inputProps={{ name: "additionalTypePrice", type: "number", min: 0, max: 10000, step: "0.01", defaultValue: coating?.additionalTypePrice ?? 5 }} />
        <FormField id="coating-description" label="Description" required as="textarea" className="sm:col-span-2" textareaProps={{ name: "description", minLength: 10, maxLength: 300, defaultValue: coating?.description }} />
        <div className="space-y-2 sm:col-span-2"><label htmlFor="coating-image" className="block text-sm font-bold">Square image (1:1){coating ? "" : " *"}</label><label htmlFor="coating-image" className="flex min-h-32 cursor-pointer items-center gap-4 rounded-card border border-dashed border-border bg-surface-control p-4">{preview ? <span role="img" aria-label="Coating image preview" className="size-24 shrink-0 rounded-control bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} /> : <ImagePlus aria-hidden="true" className="text-brand" size={30} />}<span className="text-sm"><strong className="block">{preview ? "Choose another square image" : "Choose a square product image"}</strong><span className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 3 MB</span></span><input id="coating-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectImage} /></label>{imageError ? <p className="text-xs font-bold text-danger-foreground">{imageError}</p> : null}</div>
        <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={coating?.isActive ?? true} className="size-4 accent-brand" />Available to customers</label>
        <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isAllergen" defaultChecked={coating?.isAllergen} className="size-4 accent-brand" />Contains a declared allergen</label>
        <FormField id="coating-allergen-note" label="Allergen note (required when checked)" className="sm:col-span-2" inputProps={{ name: "allergenNote", defaultValue: coating?.allergenNote, maxLength: 240 }} />
        <div className="sm:col-span-2"><ActionMessage state={state} /></div><div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><SecondaryButton disabled={pending} onClick={onClose}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={pending || Boolean(imageError)}>{pending ? "Saving…" : "Save coating"}</PrimaryButton></div>
      </form>
    </section>
  </div>;
}

function AddonSettings({ addon }: { addon: AdminCatalogAddon }) {
  const [state, action, pending] = useActionState(saveAddonAction, initialState);
  return <form action={action} className="rounded-card border border-border bg-surface p-6"><input type="hidden" name="addonId" value={addon.id} /><h3 className="font-display text-2xl">{addon.name}</h3><div className="mt-5 grid gap-5 sm:grid-cols-2"><FormField id={`addon-price-${addon.id}`} label="Price per cup (PHP)" required inputProps={{ name: "price", type: "number", min: 0, max: 10000, step: "0.01", defaultValue: addon.price }} /><label className="flex min-h-11 items-center gap-3 self-end rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={addon.isActive} className="size-4 accent-brand" />Available to customers</label></div><div className="mt-5 space-y-3"><ActionMessage state={state} /><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save add-on"}</PrimaryButton></div></form>;
}

export function CatalogManager({ product, coatings, addons }: { product: AdminCatalogProduct; coatings: AdminCatalogCoating[]; addons: AdminCatalogAddon[] }) {
  const [editor, setEditor] = useState<AdminCatalogCoating | null | undefined>(undefined);
  return <>
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Catalog summary"><AdminStatCard compact label="Available box sizes" value={String(product.variants.filter((v) => v.isActive).length)} /><AdminStatCard compact label="Active coatings" value={String(coatings.filter((c) => c.isActive).length)} accentClassName="text-success-foreground" /><AdminStatCard compact label="Active add-ons" value={String(addons.filter((a) => a.isActive).length)} accentClassName="text-warning-foreground" /></section>
    <section className="mt-7"><ProductSettings product={product} /></section>
    <section className="mt-7" aria-labelledby="box-sizes-heading"><h2 id="box-sizes-heading" className="font-display text-2xl">Box sizes</h2><p className="mt-1 text-sm text-muted-foreground">Prices are calculated from the current per-piece price. Approved piece counts stay fixed at 4, 6, and 8.</p><div className="mt-4 grid gap-4 md:grid-cols-3">{product.variants.map((variant) => <VariantCard key={`${variant.id}-${variant.isActive}`} variant={variant} piecePrice={product.pricePerPiece} />)}</div></section>
    <section className="mt-9" aria-labelledby="coatings-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="coatings-heading" className="font-display text-2xl">Coatings</h2><p className="mt-1 text-sm text-muted-foreground">The first selected type is included; every additional type uses its saved price.</p></div><PrimaryButton onClick={() => setEditor(null)}><Plus aria-hidden="true" size={17} />Add coating</PrimaryButton></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coatings.map((coating) => <article key={coating.id} className="rounded-card border border-border bg-surface p-5"><div className="aspect-square w-full rounded-control bg-surface-muted bg-cover bg-center" role="img" aria-label={`${coating.name} coating`} style={{ backgroundImage: `url(${coating.imageUrl})` }} /><div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-display text-xl">{coating.name}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{coating.description}</p></div><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${coating.isActive ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{coating.isActive ? "Active" : "Hidden"}</span></div><p className="mt-3 text-sm">Additional type: <strong>{formatPhp(coating.additionalTypePrice)}</strong></p><SecondaryButton className="mt-5 w-full" onClick={() => setEditor(coating)}><Pencil aria-hidden="true" size={15} />Edit coating</SecondaryButton></article>)}</div></section>
    <section className="mt-9" aria-labelledby="addons-heading"><h2 id="addons-heading" className="font-display text-2xl">Add-ons</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{addons.map((addon) => <AddonSettings key={addon.id} addon={addon} />)}</div></section>
    {editor !== undefined ? <CoatingEditor key={editor?.id ?? "new"} coating={editor} onClose={() => setEditor(undefined)} /> : null}
  </>;
}
