import { describe, expect, it } from "vitest";
import {
  BOX_VARIANTS,
  INITIAL_PIECE_PRICE,
  calculateBoxPrice,
  calculateCartLineTotal,
  calculateConfiguredCoatingCharge,
  calculateCoatingCharge,
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
  it("charges the configured coating price for every allocated piece", () => {
    expect(calculateCoatingCharge({ cocoa: 2, milk: 2 })).toBe(20);
    expect(calculateCoatingCharge({ cocoa: 4 }, 7)).toBe(28);
    expect(calculateCoatingCharge({ cocoa: 2, milk: 2 }, 7)).toBe(28);
    expect(calculateCoatingCharge({ cocoa: 2, milk: 2, plain: 2 }, 7)).toBe(42);
  });

  it("uses each coating's current per-piece catalog price", () => {
    const coatings = [
      { id: "cocoa", pricePerPiece: 4 },
      { id: "milk", pricePerPiece: 6 },
      { id: "plain", pricePerPiece: 2 },
    ];

    expect(calculateConfiguredCoatingCharge(
      { cocoa: 2, milk: 2, plain: 2 },
      coatings,
    )).toBe(24);
    expect(calculateConfiguredCoatingCharge({ milk: 4 }, coatings)).toBe(24);
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
      addonQuantity: 1,
      addonPrice: 18,
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
      { id: "cocoa", name: "Cocoa", description: "", imageSrc: "", pricePerPiece: 4, isDefault: true, tone: "cocoa-coating" as const },
      { id: "milk", name: "Milk", description: "", imageSrc: "", pricePerPiece: 7, isDefault: false, tone: "milk" as const },
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

    expect(priced.subtotal).toBe(160);
    expect(priced.lines[0]).toMatchObject({
      baseUnitPrice: 40,
      extraCoatingTotal: 22,
      lineSubtotal: 160,
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
