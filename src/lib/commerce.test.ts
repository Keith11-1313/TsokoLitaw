import { describe, expect, it } from "vitest";
import {
  BOX_VARIANTS,
  INITIAL_PIECE_PRICE,
  calculateBoxPrice,
  calculateCartLineTotal,
  calculateConfiguredExtraCoatingCharge,
  calculateExtraCoatingCharge,
  calculateItemUnitTotal,
  createBoxVariants,
  hasCompleteCoatingAllocation,
  priceCheckoutCart,
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

  it("uses each additional coating type's current catalog price", () => {
    const coatings = [
      { id: "cocoa", additionalTypePrice: 4 },
      { id: "milk", additionalTypePrice: 6 },
      { id: "plain", additionalTypePrice: 2 },
    ];

    expect(calculateConfiguredExtraCoatingCharge(
      { cocoa: 2, milk: 2, plain: 2 },
      coatings,
    )).toBe(8);
    expect(calculateConfiguredExtraCoatingCharge({ milk: 4 }, coatings)).toBe(0);
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

describe("server-authoritative cart pricing", () => {
  const catalog = {
    productId: "product-1",
    productName: "Chocolate-Filled Litaw",
    productDescription: "Chocolate center",
    piecePrice: 10,
    variants: [{ id: "variant-4", label: "Box of 4", pieceCount: 4 as const, price: 40 }],
    coatings: [
      { id: "cocoa", name: "Cocoa", description: "", imageSrc: "", additionalTypePrice: 4, tone: "cocoa-coating" as const },
      { id: "milk", name: "Milk", description: "", imageSrc: "", additionalTypePrice: 7, tone: "milk" as const },
    ],
    addons: [{ id: "cream", name: "Cream", slug: "cream", price: 18 }],
  };

  it("ignores browser prices and calculates current catalog totals", () => {
    const priced = priceCheckoutCart([{
      variantId: "variant-4",
      coatingCounts: { cocoa: 2, milk: 2 },
      addonId: "cream",
      addonQuantity: 1,
      quantity: 2,
    }], catalog);

    expect(priced.subtotal).toBe(130);
    expect(priced.lines[0]).toMatchObject({
      baseUnitPrice: 40,
      extraCoatingTotal: 7,
      lineSubtotal: 130,
    });
  });

  it("rejects incomplete allocations and unavailable identifiers", () => {
    expect(() => priceCheckoutCart([{
      variantId: "variant-4",
      coatingCounts: { cocoa: 3 },
      addonId: null,
      addonQuantity: 0,
      quantity: 1,
    }], catalog)).toThrow("Every piece");

    expect(() => priceCheckoutCart([{
      variantId: "missing",
      coatingCounts: { cocoa: 4 },
      addonId: null,
      addonQuantity: 0,
      quantity: 1,
    }], catalog)).toThrow("no longer available");
  });
});
