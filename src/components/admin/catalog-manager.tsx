"use client";

import { useActionState, useEffect, useState, useTransition, type ChangeEvent } from "react";
import { ImagePlus, Pencil, Plus, X } from "lucide-react";
import { saveAddonAction, saveCoatingAction, saveProductAction, saveVariantAction, type CatalogActionState } from "@/app/admin/products/actions";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { DiscardChangesDialog } from "@/components/admin/discard-changes-dialog";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormStatusHint } from "@/components/ui/form-status-hint";
import { NumberStepper } from "@/components/ui/quantity-input";
import { useFormGate } from "@/hooks/use-form-gate";
import { useEditorDialog } from "@/hooks/use-editor-dialog";
import { browserImageError } from "@/lib/form-validation";
import { formatPhp } from "@/lib/commerce";
import type { AdminCatalogAddon, AdminCatalogCoating, AdminCatalogProduct } from "@/lib/server-catalog";

const initialState: CatalogActionState = { status: "idle", message: "" };
const catalogImagePlaceholder = "/images/home/placeholder-square.jpg";

function ActionMessage({ state }: { state: CatalogActionState }) {
  if (state.status === "idle") return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`rounded-control p-3 text-sm font-bold ${state.status === "error" ? "bg-danger-background text-danger-foreground" : "bg-success-background text-success-foreground"}`}>{state.message}</p>;
}

function ProductSettings({ product }: { product: AdminCatalogProduct }) {
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  const { formRef, formProps, canSubmit, statusMessage } = useFormGate({ requireDirty: true });
  return <form ref={formRef} {...formProps} action={action} className="rounded-card border border-border bg-surface p-6">
    <input type="hidden" name="productId" value={product.id} />
    <h2 className="font-display text-2xl">Product pricing</h2>
    <p className="mt-1 text-sm text-muted-foreground">One per-piece price calculates every active box total. Checkout reloads this value from the server.</p>
    <div className="mt-5">
      <NumberStepper label="Price per piece (PHP)" name="pricePerPiece" required min={0} max={10000} step={0.01} defaultValue={product.pricePerPiece} />
      <input type="hidden" name="description" value={product.description} />
    </div>
    <div className="mt-5 space-y-3"><ActionMessage state={state} /><FormStatusHint message={statusMessage} /><PrimaryButton type="submit" disabled={pending || !canSubmit}>{pending ? "Saving…" : "Save product settings"}</PrimaryButton></div>
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

async function readSquareImage(file: File) {
  const validationError = await browserImageError(file, true);
  if (validationError) throw new Error(validationError);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.readAsDataURL(file);
  });
}

function CoatingEditor({ coating, onClose }: { coating: AdminCatalogCoating | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveCoatingAction, initialState);
  const [preview, setPreview] = useState(coating?.imageUrl ?? "");
  const [imageError, setImageError] = useState("");
  const [imageChecking, setImageChecking] = useState(false);
  const { formRef, formProps, canSubmit, statusMessage, isDirty } = useFormGate({ requireDirty: Boolean(coating), extraValid: !imageError && !imageChecking && Boolean(preview) });
  const { dialogRef, discardDialogRef, confirmDiscard, requestClose, keepEditing, discardChanges } = useEditorDialog({ isDirty, pending, onClose });
  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);
  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0]; setImageError("");
    if (!file) return;
    setImageChecking(true);
    try { setPreview(await readSquareImage(file)); } catch (error) { setImageError(error instanceof Error ? error.message : "Choose a valid square image."); }
    finally { setImageChecking(false); }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={requestClose}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="coating-editor-title" aria-hidden={confirmDiscard || undefined} onPointerDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-2xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Catalog coating</p><h2 id="coating-editor-title" className="mt-1 font-display text-3xl">{coating ? "Edit coating" : "Add coating"}</h2></div><button type="button" aria-label="Close coating editor" disabled={pending} onClick={requestClose} className="flex size-11 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" /></button></div>
      <form ref={formRef} {...formProps} action={action} className="mt-6 grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="coatingId" value={coating?.id ?? ""} /><input type="hidden" name="existingImageUrl" value={coating?.imageUrl ?? ""} />
        <FormField id="coating-name" label="Name" required error={state.fieldErrors?.name} inputProps={{ name: "name", defaultValue: coating?.name, minLength: 2, maxLength: 80, autoFocus: true }} />
        <NumberStepper label="Coating price per piece (PHP)" error={state.fieldErrors?.pricePerPiece} hint="Charged for every piece using this coating." name="pricePerPiece" required min={0} max={10000} step={0.01} defaultValue={coating?.pricePerPiece ?? 5} />
        <FormField id="coating-description" label="Description" required error={state.fieldErrors?.description} as="textarea" className="sm:col-span-2" textareaProps={{ name: "description", minLength: 10, maxLength: 300, defaultValue: coating?.description }} />
        <div className="space-y-2 sm:col-span-2"><label htmlFor="coating-image" className="block text-sm font-bold">Square image (1:1){coating?.imageUrl ? "" : " *"}</label><label htmlFor="coating-image" className="flex min-h-32 cursor-pointer items-center gap-4 rounded-card border border-dashed border-border bg-surface-control p-4">{preview ? <span role="img" aria-label="Coating image preview" className="size-24 shrink-0 rounded-control bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} /> : <ImagePlus aria-hidden="true" className="text-brand" size={30} />}<span className="text-sm"><strong className="block">{imageChecking ? "Checking image…" : preview ? "Choose another square image" : "Choose a square product image"}</strong><span className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 3 MB</span></span><input id="coating-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectImage} /></label>{imageError ? <p className="text-xs font-bold text-danger-foreground">{imageError}</p> : null}</div>
        <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={coating?.isActive ?? true} className="size-4 accent-brand" />Available to customers</label>
        <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isDefault" defaultChecked={coating?.isDefault ?? false} className="size-4 accent-brand" />Default coating</label>
        <div className="sm:col-span-2"><ActionMessage state={state} /><FormStatusHint message={statusMessage} /></div><div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><SecondaryButton disabled={pending} onClick={requestClose}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={pending || !canSubmit}>{pending ? "Saving…" : "Save coating"}</PrimaryButton></div>
      </form>
    </section>
    {confirmDiscard ? <DiscardChangesDialog dialogRef={discardDialogRef} onKeepEditing={keepEditing} onDiscard={discardChanges} /> : null}
  </div>;
}

function AddonEditor({ addon, onClose }: { addon: AdminCatalogAddon | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveAddonAction, initialState);
  const { formRef, formProps, canSubmit, statusMessage, isDirty } = useFormGate({ requireDirty: Boolean(addon) });
  const { dialogRef, discardDialogRef, confirmDiscard, requestClose, keepEditing, discardChanges } = useEditorDialog({ isDirty, pending, onClose });
  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={requestClose}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="addon-editor-title" aria-hidden={confirmDiscard || undefined} onPointerDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Catalog add-on</p><h2 id="addon-editor-title" className="mt-1 font-display text-3xl">{addon ? "Edit add-on" : "Add add-on"}</h2></div><button type="button" aria-label="Close add-on editor" disabled={pending} onClick={requestClose} className="flex size-11 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" /></button></div>
      <form ref={formRef} {...formProps} action={action} className="mt-6 grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="addonId" value={addon?.id ?? ""} />
        <FormField id="addon-name" label="Name" required inputProps={{ name: "name", defaultValue: addon?.name, minLength: 2, maxLength: 80, autoFocus: true }} />
        <NumberStepper label="Price (PHP)" name="price" required min={0} max={10000} step={0.01} defaultValue={addon?.price ?? 0} />
        <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold sm:col-span-2"><input type="checkbox" name="isActive" defaultChecked={addon?.isActive ?? true} className="size-4 accent-brand" />Available to customers</label>
        <div className="sm:col-span-2"><ActionMessage state={state} /><FormStatusHint message={statusMessage} /></div>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><SecondaryButton disabled={pending} onClick={requestClose}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={pending || !canSubmit}>{pending ? "Saving…" : "Save add-on"}</PrimaryButton></div>
      </form>
    </section>
    {confirmDiscard ? <DiscardChangesDialog dialogRef={discardDialogRef} onKeepEditing={keepEditing} onDiscard={discardChanges} /> : null}
  </div>;
}

export function CatalogManager({ product, coatings, addons }: { product: AdminCatalogProduct; coatings: AdminCatalogCoating[]; addons: AdminCatalogAddon[] }) {
  const [editor, setEditor] = useState<AdminCatalogCoating | null | undefined>(undefined);
  const [addonEditor, setAddonEditor] = useState<AdminCatalogAddon | null | undefined>(undefined);
  return <>
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Catalog summary"><AdminStatCard compact label="Available box sizes" value={String(product.variants.filter((v) => v.isActive).length)} /><AdminStatCard compact label="Active coatings" value={String(coatings.filter((c) => c.isActive).length)} accentClassName="text-success-foreground" /><AdminStatCard compact label="Active add-ons" value={String(addons.filter((a) => a.isActive).length)} accentClassName="text-warning-foreground" /></section>
    <section className="mt-7 max-w-3xl"><ProductSettings product={product} /></section>
    <section className="mt-7" aria-labelledby="box-sizes-heading"><h2 id="box-sizes-heading" className="font-display text-2xl">Box sizes</h2><p className="mt-1 text-sm text-muted-foreground">Prices are calculated from the current per-piece price. Approved piece counts stay fixed at 4, 6, and 8.</p><div className="mt-4 grid gap-4 md:grid-cols-3">{product.variants.map((variant) => <VariantCard key={`${variant.id}-${variant.isActive}`} variant={variant} piecePrice={product.pricePerPiece} />)}</div></section>
    <section className="mt-9" aria-labelledby="coatings-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="coatings-heading" className="font-display text-2xl">Coatings</h2><p className="mt-1 text-sm text-muted-foreground">Each piece uses its coating&apos;s saved price. One active coating supplies the storefront default.</p></div><PrimaryButton onClick={() => setEditor(null)}><Plus aria-hidden="true" size={17} />Add coating</PrimaryButton></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coatings.map((coating) => <article key={coating.id} className="rounded-card border border-border bg-surface p-5"><div className="aspect-square w-full rounded-control bg-surface-muted bg-cover bg-center" role="img" aria-label={`${coating.name} coating`} style={{ backgroundImage: `url(${coating.imageUrl ?? catalogImagePlaceholder})` }} /><div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-display text-xl">{coating.name}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{coating.description}</p></div><div className="flex flex-col items-end gap-1"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${coating.isActive ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{coating.isActive ? "Active" : "Hidden"}</span>{coating.isDefault ? <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-surface">Default</span> : null}</div></div><p className="mt-3 text-sm">Per piece: <strong>{formatPhp(coating.pricePerPiece)}</strong></p><SecondaryButton className="mt-5 w-full" onClick={() => setEditor(coating)}><Pencil aria-hidden="true" size={15} />Edit coating</SecondaryButton></article>)}</div></section>
    <section className="mt-9" aria-labelledby="addons-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="addons-heading" className="font-display text-2xl">Add-ons</h2><p className="mt-1 text-sm text-muted-foreground">Optional extras customers can add to a configured box.</p></div><PrimaryButton onClick={() => setAddonEditor(null)}><Plus aria-hidden="true" size={17} />Add add-on</PrimaryButton></div><div className="mt-4 grid gap-4 lg:grid-cols-2">{addons.map((addon) => <article key={addon.id} className="rounded-card border border-border bg-surface p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl">{addon.name}</h3><p className="mt-2 text-sm">Price: <strong>{formatPhp(addon.price)}</strong></p></div><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${addon.isActive ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{addon.isActive ? "Active" : "Hidden"}</span></div><SecondaryButton className="mt-5 w-full" onClick={() => setAddonEditor(addon)}><Pencil aria-hidden="true" size={15} />Edit add-on</SecondaryButton></article>)}</div></section>
    {editor !== undefined ? <CoatingEditor key={editor?.id ?? "new"} coating={editor} onClose={() => setEditor(undefined)} /> : null}
    {addonEditor !== undefined ? <AddonEditor key={addonEditor?.id ?? "new"} addon={addonEditor} onClose={() => setAddonEditor(undefined)} /> : null}
  </>;
}
