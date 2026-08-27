export interface PromotionRule {
  promotion_type: string;
  config: Record<string, unknown>;
  starts_at?: string | null;
  ends_at?: string | null;
}

function getConfigNumber(config: Record<string, unknown>, key: string) {
  const value = Number(config[key]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function isPromotionActive(promotion: PromotionRule, now: string) {
  return (
    (!promotion.starts_at || promotion.starts_at <= now)
    && (!promotion.ends_at || promotion.ends_at > now)
  );
}

export function calculatePromotionDiscount(
  subtotal: number,
  promotions: readonly PromotionRule[],
) {
  return promotions.reduce((bestDiscount, promotion) => {
    const minimumSubtotal = getConfigNumber(promotion.config, "minimum_subtotal") ?? 0;
    if (subtotal < minimumSubtotal) return bestDiscount;

    let candidate = 0;
    if (promotion.promotion_type === "PERCENTAGE_DISCOUNT") {
      const percentage = Math.min(
        getConfigNumber(promotion.config, "percentage") ?? 0,
        100,
      );
      candidate = subtotal * (percentage / 100);
      const maximumDiscount = getConfigNumber(promotion.config, "maximum_discount");
      if (maximumDiscount !== null) candidate = Math.min(candidate, maximumDiscount);
    }
    if (promotion.promotion_type === "FIXED_DISCOUNT") {
      candidate = getConfigNumber(promotion.config, "amount") ?? 0;
    }

    return Math.max(bestDiscount, Math.min(candidate, subtotal));
  }, 0);
}
