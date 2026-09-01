import "server-only";

import type { OrderStatus } from "@/components/ui/status-badge";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { measureServerOperation } from "@/lib/server-observability";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const CUSTOMER_ORDERS_PAGE_SIZE = 20;

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

export interface CustomerOrdersPage {
  orders: CustomerOrderSummary[];
  nextCursor: string | null;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  customerName: string;
  customerEmail: string;
  customerMobile: string | null;
  notes: string | null;
  cancelledAt: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    coatings: string;
  }>;
  canCancel: boolean;
}

export interface AdminOrderSummary extends CustomerOrderSummary {
  customerName: string;
  customerEmail: string;
  boxQuantity: number;
}

interface CoatingRow {
  order_item_id: string;
  coating_name_snapshot: string;
  piece_count: number;
}

interface NestedOrderItemRow {
  id: string;
  order_id?: string;
  variant_name_snapshot: string;
  quantity: number;
  unit_price_snapshot?: number | string;
  line_subtotal?: number | string;
  order_item_coatings: CoatingRow[] | null;
}

interface CustomerOrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: CustomerOrderSummary["paymentStatus"];
  total: number | string;
  created_at: string;
  pickup_date: string;
  pickup_window_snapshot: string;
  pickup_location_snapshot: string;
  order_items: NestedOrderItemRow[] | null;
}

interface CustomerOrderDetailRow extends CustomerOrderRow {
  customer_name: string;
  customer_email: string;
  customer_mobile: string | null;
  customer_notes: string | null;
  cancelled_at: string | null;
}

interface OrdersCursor {
  createdAt: string;
  id: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeCursor(value: string | undefined): OrdersCursor | null {
  if (!value || value.length > 300) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<OrdersCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") return null;
    if (!UUID_PATTERN.test(parsed.id)) return null;
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt: createdAt.toISOString(), id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCursor(row: Pick<CustomerOrderRow, "created_at" | "id">) {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id })).toString("base64url");
}

function summarizeItems(items: NestedOrderItemRow[] | null) {
  return (items ?? []).map((item) => {
    const coatingSummary = (item.order_item_coatings ?? [])
      .map((coating) => `${coating.coating_name_snapshot} × ${coating.piece_count}`)
      .join(", ");
    return `${item.variant_name_snapshot} × ${item.quantity}${coatingSummary ? ` · ${coatingSummary}` : ""}`;
  }).join("; ");
}

function toOrderSummary(order: CustomerOrderRow): CustomerOrderSummary {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    total: Number(order.total),
    orderedAt: order.created_at,
    pickupDate: order.pickup_date,
    pickupWindow: order.pickup_window_snapshot,
    pickupLocation: order.pickup_location_snapshot,
    itemSummary: summarizeItems(order.order_items),
  };
}

export async function getCustomerOrders(
  userId: string,
  cursorValue?: string,
): Promise<CustomerOrdersPage> {
  const supabase = await createServerSupabaseClient();
  const cursor = decodeCursor(cursorValue);
  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      total,
      created_at,
      pickup_date,
      pickup_window_snapshot,
      pickup_location_snapshot,
      order_items (
        id,
        order_id,
        variant_name_snapshot,
        quantity,
        order_item_coatings (
          order_item_id,
          coating_name_snapshot,
          piece_count
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("created_at", { referencedTable: "order_items", ascending: true })
    .limit(CUSTOMER_ORDERS_PAGE_SIZE + 1);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await measureServerOperation("orders.list", () => query);
  if (error) throw new Error("Customer orders could not be loaded.", { cause: error });

  const rows = (data ?? []) as unknown as CustomerOrderRow[];
  const hasNextPage = rows.length > CUSTOMER_ORDERS_PAGE_SIZE;
  const visibleRows = rows.slice(0, CUSTOMER_ORDERS_PAGE_SIZE);

  return {
    orders: visibleRows.map(toOrderSummary),
    nextCursor: hasNextPage && visibleRows.length
      ? encodeCursor(visibleRows[visibleRows.length - 1])
      : null,
  };
}

export async function getCustomerOrderDetail(
  userId: string,
  orderId: string,
): Promise<CustomerOrderDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await measureServerOperation("orders.detail", () => supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      total,
      created_at,
      pickup_date,
      pickup_window_snapshot,
      pickup_location_snapshot,
      customer_name,
      customer_email,
      customer_mobile,
      customer_notes,
      cancelled_at,
      order_items (
        id,
        order_id,
        variant_name_snapshot,
        quantity,
        unit_price_snapshot,
        line_subtotal,
        order_item_coatings (
          order_item_id,
          coating_name_snapshot,
          piece_count
        )
      )
    `)
    .eq("id", orderId)
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "order_items", ascending: true })
    .maybeSingle());

  if (error) throw new Error("Order detail could not be loaded.", { cause: error });
  if (!data) return null;

  const order = data as unknown as CustomerOrderDetailRow;
  const summary = toOrderSummary(order);
  return {
    ...summary,
    itemSummary: "",
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerMobile: order.customer_mobile,
    notes: order.customer_notes,
    cancelledAt: order.cancelled_at,
    items: (order.order_items ?? []).map((item) => ({
      id: item.id,
      name: item.variant_name_snapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price_snapshot),
      lineTotal: Number(item.line_subtotal),
      coatings: (item.order_item_coatings ?? [])
        .map((coating) => `${coating.coating_name_snapshot} × ${coating.piece_count}`)
        .join(", "),
    })),
    canCancel: order.status === "PENDING_PAYMENT" && order.payment_status === "PENDING",
  };
}

export async function getAdminOrders(): Promise<AdminOrderSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await measureServerOperation("admin.orders.list", () => supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      total,
      created_at,
      pickup_date,
      pickup_window_snapshot,
      pickup_location_snapshot,
      customer_name,
      customer_email,
      order_items (
        id,
        order_id,
        variant_name_snapshot,
        quantity,
        order_item_coatings (
          order_item_id,
          coating_name_snapshot,
          piece_count
        )
      )
    `)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("created_at", { referencedTable: "order_items", ascending: true })
    .limit(100));

  if (error) throw new Error("Admin orders could not be loaded.", { cause: error });

  return ((data ?? []) as unknown as Array<CustomerOrderRow & {
    customer_name: string;
    customer_email: string;
  }>).map((order) => ({
    ...toOrderSummary(order),
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    boxQuantity: (order.order_items ?? []).reduce((total, item) => total + item.quantity, 0),
  }));
}

export async function transitionAdminOrderStatus(input: {
  adminId: string;
  orderId: string;
  expectedStatus: OrderStatus;
  nextStatus: OrderStatus;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("transition_order_status", {
    target_admin_id: input.adminId,
    target_order_id: input.orderId,
    expected_status: input.expectedStatus,
    next_status: input.nextStatus,
  });

  if (error) {
    if (error.message.includes("status changed")) {
      throw new Error("This order was updated elsewhere. Refresh and try again.");
    }
    if (error.message.includes("not allowed")) {
      throw new Error("That fulfillment update is no longer allowed.");
    }
    if (error.message.includes("paid orders")) {
      throw new Error("Payment must be verified before fulfillment can begin.");
    }
    throw new Error("The order status could not be updated.", { cause: error });
  }

  return data as OrderStatus;
}
