import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { measureServerOperation } from "@/lib/server-observability";

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string | null;
  isActive: boolean;
  joinedAt: string;
  completedOrders: number;
  completedSpend: number;
  lastOrderAt: string | null;
}

interface AdminCustomerSummaryRow {
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  is_active: boolean;
  joined_at: string;
  completed_orders: number | string;
  completed_spend: number | string;
  last_order_at: string | null;
}

export async function getAdminCustomerSummaries(adminId: string, search = "") {
  const normalizedSearch = search.trim().slice(0, 100);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await measureServerOperation("admin.customers.list", () => supabase
    .rpc("get_admin_customer_summaries", {
      target_admin_id: adminId,
      search_value: normalizedSearch || null,
      result_limit: 100,
    }));

  if (error) throw new Error("Admin customer summaries could not be loaded.", { cause: error });

  return ((data ?? []) as AdminCustomerSummaryRow[]).map((customer) => ({
    id: customer.user_id,
    fullName: customer.full_name,
    email: customer.email,
    mobileNumber: customer.mobile_number,
    isActive: customer.is_active,
    joinedAt: customer.joined_at,
    completedOrders: Number(customer.completed_orders),
    completedSpend: Number(customer.completed_spend),
    lastOrderAt: customer.last_order_at,
  }));
}
