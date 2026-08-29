import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCommerceCatalog } from "@/lib/server-commerce";
import { priceCheckoutCart } from "@/lib/commerce";
import type { CheckoutCartInput } from "@/types/commerce";

export interface CreatePendingOrderInput {
  userId: string;
  checkoutKey: string;
  pickupWindowId: string;
  pickupLocationId: string;
  customerName: string;
  customerMobile: string;
  customerNotes: string;
  termsAccepted: boolean;
  loyaltyRewardId: string | null;
  items: readonly CheckoutCartInput[];
}

export interface PendingOrderResult {
  orderId: string;
  orderNumber: string;
  total: number;
  created: boolean;
}

export async function createPendingOrder(
  input: CreatePendingOrderInput,
): Promise<PendingOrderResult> {
  if (!input.termsAccepted) throw new Error("Terms acceptance is required.");

  const catalog = await getCommerceCatalog();
  const pricedCart = priceCheckoutCart(input.items, catalog);
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const termsResult = await supabase
    .from("terms_versions")
    .select("version")
    .eq("is_current", true)
    .lte("effective_at", now)
    .maybeSingle();

  if (termsResult.error || !termsResult.data) {
    throw new Error("The current Terms & Conditions version could not be loaded.", {
      cause: termsResult.error,
    });
  }
  const rewardDiscount = input.loyaltyRewardId
    ? pricedCart.lines
      .filter((line) => line.pieceCount === 4)
      .reduce<number | null>((lowest, line) => lowest === null ? line.baseUnitPrice : Math.min(lowest, line.baseUnitPrice), null)
    : 0;
  if (input.loyaltyRewardId && rewardDiscount === null) {
    throw new Error("A free 4-piece reward requires an eligible 4-piece box.");
  }
  const discount = rewardDiscount ?? 0;
  const total = pricedCart.subtotal - discount;
  const pricedLines = pricedCart.lines.map((line) => ({
    product_id: line.productId,
    product_name: line.productName,
    variant_id: line.variantId,
    variant_name: line.variantName,
    piece_count: line.pieceCount,
    base_unit_price: line.baseUnitPrice,
    extra_coating_total: line.extraCoatingTotal,
    quantity: line.quantity,
    line_subtotal: line.lineSubtotal,
    coatings: line.coatings.map((coating) => ({
      id: coating.id,
      name: coating.name,
      piece_count: coating.pieceCount,
      additional_price: coating.additionalPrice,
      is_included_type: coating.isIncludedType,
    })),
    addon: line.addon ? {
      id: line.addon.id,
      name: line.addon.name,
      unit_price: line.addon.unitPrice,
      quantity: line.addon.quantity,
      line_total: line.addon.lineTotal,
    } : null,
  }));

  const { data, error } = await supabase.rpc("create_pending_order", {
    target_user_id: input.userId,
    checkout_key: input.checkoutKey,
    selected_pickup_window_id: input.pickupWindowId,
    selected_pickup_location_id: input.pickupLocationId,
    customer_name_value: input.customerName,
    customer_mobile_value: input.customerMobile,
    customer_notes_value: input.customerNotes,
    priced_lines: pricedLines,
    subtotal_value: pricedCart.subtotal,
    discount_value: discount,
    total_value: total,
    terms_version_value: termsResult.data.version,
    loyalty_reward_id: input.loyaltyRewardId,
  });

  if (error) throw new Error("The pending order could not be created.", { cause: error });
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("The pending order did not return a result.");

  return {
    orderId: result.created_order_id,
    orderNumber: result.created_order_number,
    total: Number(result.created_total),
    created: result.was_created,
  };
}
