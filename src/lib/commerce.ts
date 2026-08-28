import type { BoxVariant, CartLineItem, CheckoutCartInput, Coating, CommerceCatalog, ServerPricedCart } from "@/types/commerce";

export const INITIAL_PIECE_PRICE = 10;

const BOX_SIZES = [
  { id: "box-4", label: "Box of 4", pieceCount: 4 },
  { id: "box-6", label: "Box of 6", pieceCount: 6 },
  { id: "box-8", label: "Box of 8", pieceCount: 8 },
] as const;

export function calculateBoxPrice(pieceCount: number, piecePrice: number) {
  return pieceCount * piecePrice;
}

export function createBoxVariants(piecePrice: number): readonly BoxVariant[] {
  return BOX_SIZES.map((variant) => ({
    ...variant,
    price: calculateBoxPrice(variant.pieceCount, piecePrice),
  }));
}

export const BOX_VARIANTS = createBoxVariants(INITIAL_PIECE_PRICE);

export const INITIAL_EXTRA_COATING_PRICE = 5;
export const EXTRA_SAUCE_PRICE = 18;
export const MAX_ADDON_QUANTITY = 10;
export const MAX_CART_LINE_QUANTITY = 20;

export function calculateExtraCoatingCharge(
  coatingCounts: Readonly<Record<string, number>>,
  additionalTypePrice: number = INITIAL_EXTRA_COATING_PRICE,
) {
  const distinctTypes = Object.values(coatingCounts).filter((count) => count > 0).length;
  return Math.max(0, distinctTypes - 1) * additionalTypePrice;
}

export function calculateConfiguredExtraCoatingCharge(
  coatingCounts: Readonly<Record<string, number>>,
  coatings: ReadonlyArray<Pick<Coating, "id" | "additionalTypePrice">>,
) {
  const selectedCoatings = coatings.filter(
    (coating) => (coatingCounts[coating.id] ?? 0) > 0,
  );

  return selectedCoatings
    .slice(1)
    .reduce((total, coating) => total + coating.additionalTypePrice, 0);
}

export function hasCompleteCoatingAllocation(
  pieceCount: number,
  coatingCounts: Readonly<Record<string, number>>,
) {
  const counts = Object.values(coatingCounts);
  return Number.isInteger(pieceCount)
    && pieceCount > 0
    && counts.every((count) => Number.isInteger(count) && count >= 0)
    && counts.reduce((sum, count) => sum + count, 0) === pieceCount;
}

export function formatPhp(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculateItemUnitTotal(
  boxPrice: number,
  extraCoatingCharge: number,
  addonQuantity: number,
  addonPrice: number = EXTRA_SAUCE_PRICE,
) {
  return boxPrice + extraCoatingCharge + addonQuantity * addonPrice;
}

type PricedCartLine = Pick<
  CartLineItem,
  "boxPrice" | "extraCoatingCharge" | "addonQuantity" | "addonPrice" | "quantity"
>;

export function calculateCartLineTotal(item: PricedCartLine) {
  return calculateItemUnitTotal(
    item.boxPrice,
    item.extraCoatingCharge,
    item.addonQuantity,
    item.addonPrice,
  ) * item.quantity;
}

export class CommerceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceValidationError";
  }
}

export function priceCheckoutCart(
  items: readonly CheckoutCartInput[],
  catalog: CommerceCatalog,
): ServerPricedCart {
  if (!items.length || items.length > 20) {
    throw new CommerceValidationError("The cart must contain between 1 and 20 lines.");
  }

  const lines = items.map((item) => {
    const variant = catalog.variants.find((entry) => entry.id === item.variantId);
    if (!variant) throw new CommerceValidationError("A selected box is no longer available.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_CART_LINE_QUANTITY) {
      throw new CommerceValidationError(`Each box quantity must be between 1 and ${MAX_CART_LINE_QUANTITY}.`);
    }
    if (!hasCompleteCoatingAllocation(variant.pieceCount, item.coatingCounts)) {
      throw new CommerceValidationError(`Every piece in ${variant.label} must have a coating.`);
    }

    const selectedCoatings = catalog.coatings.filter(
      (coating) => (item.coatingCounts[coating.id] ?? 0) > 0,
    );
    const submittedCoatingIds = Object.entries(item.coatingCounts)
      .filter(([, count]) => count > 0)
      .map(([id]) => id);
    if (selectedCoatings.length !== submittedCoatingIds.length) {
      throw new CommerceValidationError("A selected coating is no longer available.");
    }

    const coatings = selectedCoatings.map((coating, index) => ({
      id: coating.id,
      name: coating.name,
      pieceCount: item.coatingCounts[coating.id],
      additionalPrice: index === 0 ? 0 : coating.additionalTypePrice,
      isIncludedType: index === 0,
    }));
    const extraCoatingTotal = coatings.reduce(
      (total, coating) => total + coating.additionalPrice,
      0,
    );

    if (!Number.isInteger(item.addonQuantity) || item.addonQuantity < 0 || item.addonQuantity > MAX_ADDON_QUANTITY) {
      throw new CommerceValidationError(`The add-on quantity must be between 0 and ${MAX_ADDON_QUANTITY}.`);
    }
    const selectedAddon = item.addonQuantity > 0
      ? catalog.addons.find((addon) => addon.id === item.addonId)
      : null;
    if (item.addonQuantity > 0 && !selectedAddon) {
      throw new CommerceValidationError("The selected add-on is no longer available.");
    }
    const addon = selectedAddon ? {
      id: selectedAddon.id,
      name: selectedAddon.name,
      unitPrice: selectedAddon.price,
      quantity: item.addonQuantity,
      lineTotal: selectedAddon.price * item.addonQuantity,
    } : null;
    const lineSubtotal = (
      variant.price
      + extraCoatingTotal
      + (addon?.lineTotal ?? 0)
    ) * item.quantity;

    return {
      productId: catalog.productId,
      productName: catalog.productName,
      variantId: variant.id,
      variantName: variant.label,
      pieceCount: variant.pieceCount,
      baseUnitPrice: variant.price,
      extraCoatingTotal,
      quantity: item.quantity,
      lineSubtotal,
      coatings,
      addon,
    };
  });

  return {
    lines,
    subtotal: lines.reduce((total, line) => total + line.lineSubtotal, 0),
  };
}
