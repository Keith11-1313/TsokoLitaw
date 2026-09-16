import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { measureServerOperation } from "@/lib/server-observability";

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  accountRole: "customer" | "admin";
  isActive: boolean;
  joinedAt: string;
  completedOrders: number;
  completedSpend: number;
  lastOrderAt: string | null;
  loyaltyCompletedOrders: number;
  loyaltyThreshold: number;
  availableRewards: number;
  redeemedRewards: number;
}

interface AdminCustomerSummaryRow {
  user_id: string;
  full_name: string;
  email: string;
  account_role: "customer" | "admin";
  is_active: boolean;
  joined_at: string;
  completed_orders: number | string;
  completed_spend: number | string;
  last_order_at: string | null;
  loyalty_completed_orders: number | string;
  loyalty_threshold: number | string;
  available_rewards: number | string;
  redeemed_rewards: number | string;
}

export async function getAdminCustomerSummaries(
  adminId: string,
  search = "",
  page = 1,
  pageSize = 20,
) {
  const normalizedSearch = search.trim().slice(0, 100);
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const supabase = createAdminSupabaseClient();
  const [listResult, countResult] = await Promise.all([
    measureServerOperation("admin.customers.list", () =>
      supabase.rpc("get_admin_customer_summaries", {
        target_admin_id: adminId,
        search_value: normalizedSearch || undefined,
        result_limit: normalizedPageSize,
        result_offset: (normalizedPage - 1) * normalizedPageSize,
      }),
    ),
    measureServerOperation("admin.customers.count", () =>
      supabase.rpc("count_admin_customers", {
        target_admin_id: adminId,
        search_value: normalizedSearch || undefined,
      }),
    ),
  ]);

  if (listResult.error || countResult.error) {
    throw new Error("Admin customer summaries could not be loaded.", {
      cause: listResult.error ?? countResult.error,
    });
  }

  return {
    totalCount: Number(countResult.data ?? 0),
    customers: ((listResult.data ?? []) as AdminCustomerSummaryRow[]).map((customer) => ({
      id: customer.user_id,
      fullName: customer.full_name,
      email: customer.email,
      accountRole: customer.account_role,
      isActive: customer.is_active,
      joinedAt: customer.joined_at,
      completedOrders: Number(customer.completed_orders),
      completedSpend: Number(customer.completed_spend),
      lastOrderAt: customer.last_order_at,
      loyaltyCompletedOrders: Number(customer.loyalty_completed_orders),
      loyaltyThreshold: Number(customer.loyalty_threshold),
      availableRewards: Number(customer.available_rewards),
      redeemedRewards: Number(customer.redeemed_rewards),
    })),
  };
}
