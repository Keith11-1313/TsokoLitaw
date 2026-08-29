"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import {
  saveCatalogAddon, saveCatalogCoating, updateCatalogProduct,
  updateCatalogVariant, uploadCatalogImage,
} from "@/lib/server-catalog";
import { enforceMutationRateLimit, MutationRateLimitError } from "@/lib/server-rate-limit";

export type CatalogActionState = { status: "idle" | "success" | "error"; message: string };
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function refreshCatalog() {
  revalidateTag("commerce-catalog", "max");
  revalidatePath("/admin/products");
  revalidatePath("/our-creations");
  revalidatePath("/checkout");
}

function failure(error: unknown, fallback: string): CatalogActionState {
  return { status: "error", message: error instanceof MutationRateLimitError
    ? `Too many updates. Try again in about ${error.retryAfterSeconds} seconds.`
    : error instanceof Error ? error.message : fallback };
}

async function guard(adminId: string) {
  await enforceMutationRateLimit({ scope: "admin-catalog-save", userId: adminId, maximumRequests: 30, windowSeconds: 300 });
}

export async function saveProductAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const admin = await requireAdmin("/admin/products");
  const productId = String(formData.get("productId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("pricePerPiece"));
  if (!isUuid(productId) || description.length < 10 || description.length > 500 || !Number.isFinite(price) || price < 0 || price > 10000) {
    return { status: "error", message: "Check the product description and price." };
  }
  try {
    await guard(admin.id);
    await updateCatalogProduct({ adminId: admin.id, productId, description, pricePerPiece: price });
    refreshCatalog();
    return { status: "success", message: "Product pricing saved." };
  } catch (error) { return failure(error, "Product settings could not be saved."); }
}

export async function saveVariantAction(input: { variantId: string; isActive: boolean }): Promise<CatalogActionState> {
  const admin = await requireAdmin("/admin/products");
  if (!isUuid(input.variantId)) return { status: "error", message: "That box size is unavailable." };
  try {
    await guard(admin.id);
    await updateCatalogVariant({ adminId: admin.id, ...input });
    refreshCatalog();
    return { status: "success", message: "Box availability saved." };
  } catch (error) { return failure(error, "Box availability could not be saved."); }
}

export async function saveCoatingAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const admin = await requireAdmin("/admin/products");
  const coatingIdValue = String(formData.get("coatingId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const existingImageUrl = String(formData.get("existingImageUrl") ?? "").trim();
  const price = Number(formData.get("additionalTypePrice"));
  const isAllergen = formData.get("isAllergen") === "on";
  const allergenNote = String(formData.get("allergenNote") ?? "").trim();
  const image = formData.get("image");
  if ((coatingIdValue && !isUuid(coatingIdValue)) || name.length < 2 || name.length > 80
    || description.length < 10 || description.length > 300 || !Number.isFinite(price) || price < 0 || price > 10000
    || (isAllergen && !allergenNote)) return { status: "error", message: "Check the coating details, price, and allergen note." };
  if (image instanceof File && image.size > 0 && (!imageTypes.has(image.type) || image.size > 3 * 1024 * 1024)) {
    return { status: "error", message: "Upload a square JPG, PNG, or WebP image no larger than 3 MB." };
  }
  try {
    await guard(admin.id);
    let imageUrl = existingImageUrl;
    if (image instanceof File && image.size > 0) imageUrl = await uploadCatalogImage({ adminId: admin.id, file: image });
    if (!imageUrl) return { status: "error", message: "Choose a square coating image." };
    await saveCatalogCoating({ adminId: admin.id, coatingId: coatingIdValue || null, name, description, imageUrl,
      additionalTypePrice: price, isActive: formData.get("isActive") === "on", isAllergen, allergenNote });
    refreshCatalog();
    return { status: "success", message: "Coating saved to the customer catalog." };
  } catch (error) { return failure(error, "Coating could not be saved."); }
}

export async function saveAddonAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const admin = await requireAdmin("/admin/products");
  const addonIdValue = String(formData.get("addonId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  if ((addonIdValue && !isUuid(addonIdValue)) || name.length < 2 || name.length > 80
    || !Number.isFinite(price) || price < 0 || price > 10000) return { status: "error", message: "Enter a valid add-on name and price." };
  try {
    await guard(admin.id);
    await saveCatalogAddon({ adminId: admin.id, addonId: addonIdValue || null, name, price, isActive: formData.get("isActive") === "on" });
    refreshCatalog();
    return { status: "success", message: "Add-on saved to the customer catalog." };
  } catch (error) { return failure(error, "Add-on settings could not be saved."); }
}
