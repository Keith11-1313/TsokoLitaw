import { describe, expect, it } from "vitest";
import { calculatePromotionDiscount, isPromotionActive } from "./promotion";

describe("promotion pricing", () => {
  it("uses the best eligible percentage or fixed discount", () => {
    expect(calculatePromotionDiscount(100, [
      { promotion_type: "PERCENTAGE_DISCOUNT", config: { percentage: 10 } },
      { promotion_type: "FIXED_DISCOUNT", config: { amount: 15 } },
    ])).toBe(15);
  });

  it("honors minimum subtotals, caps, and the order subtotal", () => {
    expect(calculatePromotionDiscount(200, [{
      promotion_type: "PERCENTAGE_DISCOUNT",
      config: { percentage: 50, minimum_subtotal: 150, maximum_discount: 30 },
    }])).toBe(30);
    expect(calculatePromotionDiscount(100, [{
      promotion_type: "FIXED_DISCOUNT",
      config: { amount: 500 },
    }])).toBe(100);
    expect(calculatePromotionDiscount(100, [{
      promotion_type: "FIXED_DISCOUNT",
      config: { amount: 20, minimum_subtotal: 150 },
    }])).toBe(0);
  });

  it("checks configured start and end times", () => {
    const now = "2026-08-28T00:00:00.000Z";
    expect(isPromotionActive({
      promotion_type: "FIXED_DISCOUNT",
      config: {},
      starts_at: "2026-08-27T00:00:00.000Z",
      ends_at: "2026-08-29T00:00:00.000Z",
    }, now)).toBe(true);
    expect(isPromotionActive({
      promotion_type: "FIXED_DISCOUNT",
      config: {},
      starts_at: "2026-08-29T00:00:00.000Z",
    }, now)).toBe(false);
  });
});
