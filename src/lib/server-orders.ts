import "server-only";

import type { OrderStatus } from "@/components/ui/status-badge";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  total: number;
  orderedAt: string;
  pickupDate: string;
  pickupWindow: string;
  pickupLocation: string;
  itemSummary: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  variant_name_snapshot: string;
  quantity: number;
}

interface CoatingRow {
  order_item_id: string;
  coating_name_snapshot: string;
  piece_count: number;
}

export async function getCustomerOrders(userId: string): Promise<CustomerOrderSummary[]> {
  const supabase = createAdminSupabaseClient();
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at, pickup_date, pickup_window_snapshot, pickup_location_snapshot")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (ordersError) throw new Error("Customer orders could not be loaded.", { cause: ordersError });
  if (!orders?.length) return [];

  const orderIds = orders.map((order) => order.id);
  const itemsResult = await supabase
    .from("order_items")
    .select("id, order_id, variant_name_snapshot, quantity")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });
  if (itemsResult.error) throw new Error("Order items could not be loaded.", { cause: itemsResult.error });

  const items = (itemsResult.data ?? []) as OrderItemRow[];
  const itemIds = items.map((item) => item.id);
  const { data: coatingsData, error: coatingsError } = itemIds.length
    ? await supabase.from("order_item_coatings").select("order_item_id, coating_name_snapshot, piece_count").in("order_item_id", itemIds)
    : { data: [], error: null };
  if (coatingsError) throw new Error("Order coatings could not be loaded.", { cause: coatingsError });

  const coatingsByItem = new Map<string, CoatingRow[]>();
  for (const coating of (coatingsData ?? []) as CoatingRow[]) {
    const current = coatingsByItem.get(coating.order_item_id) ?? [];
    current.push(coating);
    coatingsByItem.set(coating.order_item_id, current);
  }
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  }
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status as OrderStatus,
    paymentStatus: order.payment_status,
    total: Number(order.total),
    orderedAt: order.created_at,
    pickupDate: order.pickup_date,
    pickupWindow: order.pickup_window_snapshot,
    pickupLocation: order.pickup_location_snapshot,
    itemSummary: (itemsByOrder.get(order.id) ?? []).map((item) => {
      const coatingSummary = (coatingsByItem.get(item.id) ?? []).map((coating) => `${coating.coating_name_snapshot} × ${coating.piece_count}`).join(", ");
      return `${item.variant_name_snapshot} × ${item.quantity}${coatingSummary ? ` · ${coatingSummary}` : ""}`;
    }).join("; "),
  }));
}
