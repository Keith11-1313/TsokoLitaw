"use client";

import Image from "next/image";
import { CheckCircle2, ImagePlus, Pencil, Plus, X } from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { BOX_VARIANTS, COATINGS, EXTRA_SAUCE_PRICE, formatPhp } from "@/lib/commerce";

interface PreviewCoating {
  id: string;
  name: string;
  description: string;
  imageDataUrl: string;
  additionalTypePrice: number;
}

const columns: readonly AdminTableColumn[] = [
  { key: "item", label: "Customer-facing item" },
  { key: "type", label: "Type" },
  { key: "price", label: "Pricing" },
  { key: "availability", label: "Customer availability" },
  { key: "action", label: "Action" },
];

const previewBadge = (
  <span className="rounded-lg bg-warning-background px-2.5 py-1 text-xs font-bold text-warning-foreground">
    Session preview only
  </span>
);

const publishedBadge = (
  <span className="rounded-lg bg-success-background px-2.5 py-1 text-xs font-bold text-success-foreground">
    Shown in builder
  </span>
);

function disabledEditButton(label: string) {
  return (
    <button
      type="button"
      disabled
      title="Editing requires backend persistence"
      aria-label={`Edit ${label}`}
      className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand opacity-60"
    >
      <Pencil aria-hidden="true" size={15} />
    </button>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function readImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The selected file is not a valid image."));
    image.src = dataUrl;
  });
}

export function CatalogManager() {
  const [previewCoatings, setPreviewCoatings] = useState<PreviewCoating[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("5");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("5");
    setImageDataUrl("");
    setImageName("");
    setImageError("");
    setFormError("");
  }

  function closeDialog() {
    setOpen(false);
    resetForm();
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError("");
    setImageDataUrl("");
    setImageName("");

    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const size = await readImageSize(dataUrl);
      if (size.width !== size.height) {
        setImageError(`Use a square 1:1 image. This file is ${size.width} × ${size.height}px.`);
        event.target.value = "";
        return;
      }
      setImageDataUrl(dataUrl);
      setImageName(file.name);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "The image could not be read.");
      event.target.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const numericPrice = Number(price);

    if (!name.trim() || !description.trim() || !imageDataUrl) {
      setFormError("Complete the name, description, square image, and price.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setFormError("Enter a valid price of ₱0 or more.");
      return;
    }

    const coating: PreviewCoating = {
      id: `preview-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      imageDataUrl,
      additionalTypePrice: numericPrice,
    };
    setPreviewCoatings((current) => [...current, coating]);
    setStatusMessage(`${coating.name} was added to this Admin session preview. It is not published to Customer.`);
    closeDialog();
  }

  const rows: readonly Record<string, ReactNode>[] = [
    ...BOX_VARIANTS.map((variant) => ({
      item: <div><strong className="block text-foreground">{variant.label}</strong><span className="text-xs text-muted-foreground">{variant.pieceCount} chocolate-filled pieces</span></div>,
      type: "Box size",
      price: <strong className="text-foreground">{formatPhp(variant.price)}</strong>,
      availability: publishedBadge,
      action: disabledEditButton(variant.label),
    })),
    ...COATINGS.map((coating) => ({
      item: <div className="flex items-center gap-3"><Image src={coating.imageSrc} alt="" width={48} height={48} className="size-12 rounded-control object-cover" /><div><strong className="block text-foreground">{coating.name}</strong><span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">{coating.description}</span></div></div>,
      type: "Coating",
      price: <span>First type included; <strong className="text-foreground">+{formatPhp(coating.additionalTypePrice)}</strong> as an additional type</span>,
      availability: publishedBadge,
      action: disabledEditButton(coating.name),
    })),
    ...previewCoatings.map((coating) => ({
      item: <div className="flex items-center gap-3"><div role="img" aria-label={`${coating.name} coating preview`} className="size-12 shrink-0 rounded-control bg-cover bg-center" style={{ backgroundImage: `url(${coating.imageDataUrl})` }} /><div><strong className="block text-foreground">{coating.name}</strong><span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">{coating.description}</span></div></div>,
      type: "Coating",
      price: <span>First type included; <strong className="text-foreground">+{formatPhp(coating.additionalTypePrice)}</strong> as an additional type</span>,
      availability: previewBadge,
      action: disabledEditButton(coating.name),
    })),
    {
      item: <div><strong className="block text-foreground">Extra sea salt cream</strong><span className="text-xs text-muted-foreground">Optional cup added to a configured box</span></div>,
      type: "Add-on",
      price: <strong className="text-foreground">{formatPhp(EXTRA_SAUCE_PRICE)} per cup</strong>,
      availability: publishedBadge,
      action: disabledEditButton("extra sea salt cream"),
    },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Catalog summary">
        <AdminStatCard compact label="Box Sizes" value={String(BOX_VARIANTS.length)} />
        <AdminStatCard compact label="Coatings" value={String(COATINGS.length + previewCoatings.length)} accentClassName="text-success-foreground" />
        <AdminStatCard compact label="Add-ons" value="1" accentClassName="text-warning-foreground" />
      </section>

      <section className="mt-7" aria-labelledby="catalog-items-heading">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="catalog-items-heading" className="font-display text-2xl text-foreground">Catalog items</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Coating images must be square. The price is charged only when that coating is an additional type in a mixed box; the first type remains included.
            </p>
          </div>
          <PrimaryButton type="button" onClick={() => { setStatusMessage(""); setOpen(true); }} className="shrink-0">
            <Plus aria-hidden="true" size={17} /> Add coating
          </PrimaryButton>
        </div>
        {statusMessage ? (
          <p role="status" className="mb-4 flex items-start gap-2 rounded-control bg-success-background p-4 text-sm font-bold text-success-foreground">
            <CheckCircle2 className="mt-0.5 shrink-0" aria-hidden="true" size={18} /> {statusMessage}
          </p>
        ) : null}
        <AdminDataTable caption="Customer catalog" columns={columns} rows={rows} minimumWidth="62rem" />
      </section>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={closeDialog}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-coating-title"
            aria-describedby="add-coating-description"
            onPointerDown={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-xl rounded-card border border-border bg-surface p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-coating-title" className="font-display text-2xl text-foreground">Add coating</h2>
                <p id="add-coating-description" className="mt-1 text-sm leading-6 text-muted-foreground">
                  Preview a catalog entry in this browser session. It will not be saved or published yet.
                </p>
              </div>
              <button type="button" aria-label="Close add coating dialog" onClick={closeDialog} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <FormField id="coating-name" label="Name" required inputProps={{ value: name, onChange: (event) => setName(event.target.value), placeholder: "e.g. Toasted Coconut", autoFocus: true }} />
              <FormField id="coating-description" label="Description" required as="textarea" textareaProps={{ value: description, onChange: (event) => setDescription(event.target.value), placeholder: "Describe the coating and what customers can expect." }} />
              <FormField id="coating-price" label="Additional type price (PHP)" hint="The first coating type stays included. Use 0 for no extra charge." required inputProps={{ value: price, onChange: (event) => setPrice(event.target.value), type: "number", min: 0, step: "0.01", inputMode: "decimal" }} />

              <div className="space-y-2">
                <label className="block text-sm font-bold text-foreground" htmlFor="coating-image">Square image (1:1)<span className="ml-1 text-danger-foreground" aria-hidden="true">*</span></label>
                <label htmlFor="coating-image" className="grid min-h-36 cursor-pointer place-items-center overflow-hidden rounded-card border border-dashed border-border bg-surface-control text-center focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20">
                  {imageDataUrl ? (
                    <div className="flex w-full items-center gap-4 p-4 text-left">
                      <div role="img" aria-label="Selected square coating image preview" className="aspect-square w-24 shrink-0 rounded-control bg-cover bg-center" style={{ backgroundImage: `url(${imageDataUrl})` }} />
                      <div><p className="font-bold text-foreground">{imageName}</p><p className="mt-1 text-xs text-muted-foreground">Square image ready. Choose another file to replace it.</p></div>
                    </div>
                  ) : (
                    <div className="p-5"><ImagePlus className="mx-auto text-brand" aria-hidden="true" size={28} /><p className="mt-2 font-bold text-foreground">Choose a square product image</p><p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WebP</p></div>
                  )}
                  <input id="coating-image" name="coating-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleImageChange} aria-describedby={imageError ? "coating-image-error" : undefined} aria-invalid={Boolean(imageError) || undefined} />
                </label>
                {imageError ? <p id="coating-image-error" className="text-xs font-bold text-danger-foreground">{imageError}</p> : null}
              </div>

              {formError ? <p role="alert" className="rounded-control bg-danger-background p-3 text-sm font-bold text-danger-foreground">{formError}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <SecondaryButton type="button" onClick={closeDialog}>Cancel</SecondaryButton>
                <PrimaryButton type="submit">Add to preview</PrimaryButton>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
