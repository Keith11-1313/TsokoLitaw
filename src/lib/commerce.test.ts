import { describe, expect, it } from "vitest";
import {
  BOX_VARIANTS,
  INITIAL_PIECE_PRICE,
  calculateBoxPrice,
  calculateCartLineTotal,
  calculateExtraCoatingCharge,
  calculateItemUnitTotal,
  createBoxVariants,
  hasCompleteCoatingAllocation,
} from "./commerce";

describe("box pricing", () => {
  it("derives the initial box totals from the ₱10 per-piece seed", () => {
    expect(INITIAL_PIECE_PRICE).toBe(10);
    expect(BOX_VARIANTS.map((variant) => variant.price)).toEqual([40, 60, 80]);
  });

  it("recalculates every size from an admin-configured per-piece price", () => {
    expect(createBoxVariants(12.5).map((variant) => variant.price)).toEqual([50, 75, 100]);
    expect(calculateBoxPrice(6, 14)).toBe(84);
  });
});

describe("configuration calculations", () => {
  it("charges only coating types after the first", () => {
    expect(calculateExtraCoatingCharge({ cocoa: 2, milk: 2 })).toBe(5);
    expect(calculateExtraCoatingCharge({ cocoa: 4 }, 7)).toBe(0);
    expect(calculateExtraCoatingCharge({ cocoa: 2, milk: 2 }, 7)).toBe(7);
    expect(calculateExtraCoatingCharge({ cocoa: 2, milk: 2, plain: 2 }, 7)).toBe(14);
  });

  it("accepts only complete, whole-piece allocations", () => {
    expect(hasCompleteCoatingAllocation(6, { cocoa: 3, milk: 3 })).toBe(true);
    expect(hasCompleteCoatingAllocation(6, { cocoa: 3, milk: 2 })).toBe(false);
    expect(hasCompleteCoatingAllocation(6, { cocoa: 3, milk: 3.5 })).toBe(false);
    expect(hasCompleteCoatingAllocation(6, { cocoa: 7, milk: -1 })).toBe(false);
  });

  it("uses configured box and add-on prices instead of fixed UI constants", () => {
    expect(calculateItemUnitTotal(84, 7, 2, 11)).toBe(113);
  });

  it("applies cart quantity after calculating one configured box", () => {
    expect(calculateCartLineTotal({
      boxPrice: 50,
      extraCoatingCharge: 5,
      extraSauceQuantity: 1,
      extraSaucePrice: 18,
      quantity: 3,
    })).toBe(219);
  });
});
