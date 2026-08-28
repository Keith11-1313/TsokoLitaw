"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import { recordInventoryConsumption, saveDailyInventory } from "@/lib/server-inventory";
import { enforceMutationRateLimit, MutationRateLimitError } from "@/lib/server-rate-limit";

export type InventoryActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function refreshInventory() {
  revalidatePath("/admin/inventory");
  revalidatePath("/checkout");
}

function failure(error: unknown, fallback: string): InventoryActionState {
  if (error instanceof MutationRateLimitError) {
    return {
      status: "error",
      message: `Too many inventory updates. Try again in about ${error.retryAfterSeconds} seconds.`,
    };
  }
  return {
    status: "error",
    message: error instanceof Error ? error.message : fallback,
  };
}

async function guard(adminId: string) {
  await enforceMutationRateLimit({
    scope: "admin-inventory-save",
    userId: adminId,
    maximumRequests: 30,
    windowSeconds: 300,
  });
}

export async function saveInventoryAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const admin = await requireAdmin("/admin/inventory");
  const pickupDate = String(formData.get("pickupDate") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const stockTotal = Number(formData.get("stockTotal"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !isUuid(productId)
    || !Number.isInteger(stockTotal) || stockTotal < 0 || stockTotal > 100000
    || notes.length > 240) {
    return { status: "error", message: "Check the pickup date, piece total, and notes." };
  }

  try {
    await guard(admin.id);
    await saveDailyInventory({
      adminId: admin.id,
      pickupDate,
      productId,
      stockTotal,
      isAvailable: formData.get("isAvailable") === "on",
      notes,
    });
    refreshInventory();
    return { status: "success", message: "Ready-stock pieces saved." };
  } catch (error) {
    return failure(error, "Inventory could not be saved.");
  }
}

export async function consumeInventoryAction(
  _state: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const admin = await requireAdmin("/admin/inventory");
  const inventoryId = String(formData.get("inventoryId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const reason = String(formData.get("reason") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!isUuid(inventoryId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000
    || (reason !== "WALK_IN_SALE" && reason !== "WASTE") || notes.length > 240) {
    return { status: "error", message: "Check the piece quantity, reason, and notes." };
  }

  try {
    await guard(admin.id);
    await recordInventoryConsumption({
      adminId: admin.id,
      inventoryId,
      quantity,
      reason,
      notes,
    });
    refreshInventory();
    return {
      status: "success",
      message: reason === "WALK_IN_SALE" ? "Walk-in sale recorded." : "Waste recorded.",
    };
  } catch (error) {
    return failure(error, "Inventory consumption could not be recorded.");
  }
}
