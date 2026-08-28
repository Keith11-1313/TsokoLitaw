import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InventoryMode = "READY_STOCK" | "HYBRID";

export interface AdminInventoryDate {
  id: string;
  pickupDate: string;
  availabilityMode: InventoryMode;
  isOpen: boolean;
}

export interface AdminInventoryRecord {
  id: string;
  pickupDate: string;
  productId: string;
  productName: string;
  stockTotal: number;
  stockReserved: number;
  stockConsumed: number;
  stockAvailable: number;
  isAvailable: boolean;
  updatedAt: string;
}

interface InventoryRow {
  id: string;
  pickup_date: string;
  product_id: string;
  stock_total: number;
  stock_reserved: number;
  stock_sold: number;
  is_available: boolean;
  updated_at: string;
  products: { name: string } | null;
}

function getManilaDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function getAdminInventory() {
  const supabase = await createServerSupabaseClient();
  const [productResult, datesResult, inventoryResult] = await Promise.all([
    supabase.from("products").select("id,name").order("created_at").limit(1).maybeSingle(),
    supabase
      .from("pickup_dates")
      .select("id,pickup_date,availability_mode,is_open")
      .gte("pickup_date", getManilaDate())
      .in("availability_mode", ["READY_STOCK", "HYBRID"])
      .order("pickup_date"),
    supabase
      .from("daily_inventory")
      .select("id,pickup_date,product_id,stock_total,stock_reserved,stock_sold,is_available,updated_at,products(name)")
      .not("product_id", "is", null)
      .gte("pickup_date", getManilaDate())
      .order("pickup_date"),
  ]);

  if (productResult.error || !productResult.data || datesResult.error || inventoryResult.error) {
    throw new Error("Inventory could not be loaded.", {
      cause: productResult.error ?? datesResult.error ?? inventoryResult.error,
    });
  }
  const productData = productResult.data;

  const dates: AdminInventoryDate[] = (datesResult.data ?? []).map((date) => ({
    id: date.id,
    pickupDate: date.pickup_date,
    availabilityMode: date.availability_mode as InventoryMode,
    isOpen: date.is_open,
  }));
  const records: AdminInventoryRecord[] = ((inventoryResult.data ?? []) as unknown as InventoryRow[]).map((row) => ({
    id: row.id,
    pickupDate: row.pickup_date,
    productId: row.product_id,
    productName: row.products?.name ?? productData.name,
    stockTotal: row.stock_total,
    stockReserved: row.stock_reserved,
    stockConsumed: row.stock_sold,
    stockAvailable: row.stock_total - row.stock_reserved - row.stock_sold,
    isAvailable: row.is_available,
    updatedAt: row.updated_at,
  }));

  return {
    product: { id: productData.id, name: productData.name },
    dates,
    records,
  };
}

export async function saveDailyInventory(input: {
  adminId: string;
  pickupDate: string;
  productId: string;
  stockTotal: number;
  isAvailable: boolean;
  notes: string;
}) {
  const { error } = await createAdminSupabaseClient().rpc("upsert_daily_inventory", {
    target_admin_id: input.adminId,
    target_pickup_date: input.pickupDate,
    target_product_id: input.productId,
    stock_total_value: input.stockTotal,
    available_value: input.isAvailable,
    notes_value: input.notes,
  });
  if (error) throw new Error(error.message || "Inventory could not be saved.", { cause: error });
}

export async function recordInventoryConsumption(input: {
  adminId: string;
  inventoryId: string;
  quantity: number;
  reason: "WASTE";
  notes: string;
}) {
  const { error } = await createAdminSupabaseClient().rpc("record_inventory_consumption", {
    target_admin_id: input.adminId,
    target_inventory_id: input.inventoryId,
    quantity_value: input.quantity,
    reason_value: input.reason,
    notes_value: input.notes,
  });
  if (error) throw new Error(error.message || "Inventory consumption could not be recorded.", { cause: error });
}
