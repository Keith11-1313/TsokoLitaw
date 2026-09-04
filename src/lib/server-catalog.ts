import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateUploadedImage } from "@/lib/server-image-validation";

export interface AdminCatalogProduct {
  id: string;
  name: string;
  description: string;
  pricePerPiece: number;
  isActive: boolean;
  variants: Array<{ id: string; name: string; pieceCount: number; isActive: boolean; sortOrder: number }>;
}

export interface AdminCatalogCoating {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  pricePerPiece: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCatalogAddon {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface ProductRow {
  id: string; name: string; description: string; price_per_piece: number | string; is_active: boolean;
  product_variants: Array<{ id: string; name: string; piece_count: number; is_active: boolean; sort_order: number }> | null;
}

export async function getAdminCatalog() {
  const supabase = await createServerSupabaseClient();
  const [productResult, coatingsResult, addonsResult] = await Promise.all([
    supabase.from("products").select(`id,name,description,price_per_piece,is_active,product_variants(id,name,piece_count,is_active,sort_order)`).order("created_at").limit(1).maybeSingle(),
    supabase.from("coatings").select().order("sort_order"),
    supabase.from("addons").select("id,name,price,is_active").order("created_at"),
  ]);
  if (productResult.error || !productResult.data || coatingsResult.error || addonsResult.error) {
    throw new Error("The Admin catalog could not be loaded.", { cause: productResult.error ?? coatingsResult.error ?? addonsResult.error });
  }
  const row = productResult.data as unknown as ProductRow;
  const product: AdminCatalogProduct = {
    id: row.id, name: row.name, description: row.description,
    pricePerPiece: Number(row.price_per_piece), isActive: row.is_active,
    variants: (row.product_variants ?? []).sort((a, b) => a.sort_order - b.sort_order).map((variant) => ({
      id: variant.id, name: variant.name, pieceCount: variant.piece_count,
      isActive: variant.is_active, sortOrder: variant.sort_order,
    })),
  };
  const coatings: AdminCatalogCoating[] = (coatingsResult.data ?? []).map((coating, index) => ({
    id: coating.id, name: coating.name, description: coating.description,
    imageUrl: coating.image_url,
    pricePerPiece: Number(coating.price_per_piece ?? coating.additional_type_price),
    isDefault: coating.is_default ?? index === 0,
    isActive: coating.is_active, sortOrder: coating.sort_order,
  }));
  const addons: AdminCatalogAddon[] = (addonsResult.data ?? []).map((addon) => ({
    id: addon.id, name: addon.name, price: Number(addon.price), isActive: addon.is_active,
  }));
  return { product, coatings, addons };
}

export async function updateCatalogProduct(input: { adminId: string; productId: string; description: string; pricePerPiece: number }) {
  const { error } = await createAdminSupabaseClient().rpc("update_catalog_product", {
    target_admin_id: input.adminId, target_product_id: input.productId,
    description_value: input.description, price_per_piece_value: input.pricePerPiece, active_value: true,
  });
  if (error) throw new Error("Product settings could not be saved.", { cause: error });
}

export async function updateCatalogVariant(input: { adminId: string; variantId: string; isActive: boolean }) {
  const { error } = await createAdminSupabaseClient().rpc("update_catalog_variant", {
    target_admin_id: input.adminId, target_variant_id: input.variantId, active_value: input.isActive,
  });
  if (error) throw new Error("Box availability could not be saved.", { cause: error });
}

export async function saveCatalogCoating(input: {
  adminId: string; coatingId: string | null; name: string; description: string; imageUrl: string;
  pricePerPiece: number; isActive: boolean; isDefault: boolean;
}) {
  const { error } = await createAdminSupabaseClient().rpc("upsert_catalog_coating", {
    target_admin_id: input.adminId, target_coating_id: input.coatingId, name_value: input.name,
    description_value: input.description, image_url_value: input.imageUrl,
    price_per_piece_value: input.pricePerPiece, active_value: input.isActive,
    default_value: input.isDefault,
  });
  if (error) throw new Error("Coating could not be saved.", { cause: error });
}

export async function saveCatalogAddon(input: { adminId: string; addonId: string | null; name: string; price: number; isActive: boolean }) {
  const { error } = await createAdminSupabaseClient().rpc("upsert_catalog_addon", {
    target_admin_id: input.adminId, target_addon_id: input.addonId, name_value: input.name,
    price_value: input.price, active_value: input.isActive,
  });
  if (error) throw new Error("Add-on settings could not be saved.", { cause: error });
}

export async function uploadCatalogImage(input: { adminId: string; file: File }) {
  const validated = await validateUploadedImage(input.file, { requireSquare: true, label: "catalog image" });
  const path = `${input.adminId}/${crypto.randomUUID()}.${validated.extension}`;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from("catalog-media").upload(path, validated.buffer, {
    contentType: validated.contentType, cacheControl: "31536000", upsert: false,
  });
  if (error) {
    const detail = error.message.toLowerCase();
    if (detail.includes("bucket") && (detail.includes("not found") || detail.includes("does not exist"))) {
      throw new Error("Catalog media storage is not configured in this environment.", { cause: error });
    }
    if (detail.includes("unauthorized") || detail.includes("jwt") || detail.includes("permission")) {
      throw new Error("Catalog media storage is not authorized in this environment.", { cause: error });
    }
    throw new Error("Catalog image could not be uploaded.", { cause: error });
  }
  return { path, url: admin.storage.from("catalog-media").getPublicUrl(path).data.publicUrl };
}

export async function removeCatalogImage(path: string) {
  const { error } = await createAdminSupabaseClient().storage.from("catalog-media").remove([path]);
  if (error) throw new Error("The newly uploaded catalog image could not be cleaned up.", { cause: error });
}
