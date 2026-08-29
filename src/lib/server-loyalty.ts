import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface CustomerLoyaltyStatus {
  completedOrderCount: number;
  threshold: number;
  progress: number;
  availableRewards: Array<{
    id: string;
    earnedAt: string;
  }>;
}

export async function getCustomerLoyaltyStatus(userId: string): Promise<CustomerLoyaltyStatus> {
  const supabase = createAdminSupabaseClient();
  const [accountResult, rewardsResult, thresholdResult] = await Promise.all([
    supabase
      .from("loyalty_accounts")
      .select("completed_order_count")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("loyalty_rewards")
      .select("id,earned_at")
      .eq("user_id", userId)
      .eq("reward_type", "FREE_4_PIECE")
      .eq("status", "earned")
      .order("earned_at"),
    supabase
      .from("business_settings")
      .select("value")
      .eq("key", "loyalty_threshold")
      .maybeSingle(),
  ]);

  const error = accountResult.error ?? rewardsResult.error ?? thresholdResult.error;
  if (error) throw new Error("Loyalty status could not be loaded.", { cause: error });

  const threshold = Math.max(Number(thresholdResult.data?.value ?? 7), 1);
  const completedOrderCount = Number(accountResult.data?.completed_order_count ?? 0);

  return {
    completedOrderCount,
    threshold,
    progress: completedOrderCount % threshold,
    availableRewards: (rewardsResult.data ?? []).map((reward) => ({
      id: reward.id,
      earnedAt: reward.earned_at,
    })),
  };
}
