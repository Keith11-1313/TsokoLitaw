import type { BoxVariant, CartLineItem, Coating } from "@/types/commerce";

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

export const COATINGS: readonly Coating[] = [
  { id: "cocoa", name: "Cocoa", description: "A rich cocoa coating over the chocolate-filled base.", imageSrc: "/images/products/coatings/cocoa.jpeg", additionalTypePrice: 5, tone: "cocoa-coating" },
  { id: "milk", name: "Milk", description: "A creamy milk coating with a soft, mellow finish.", imageSrc: "/images/products/coatings/milk.jpeg", additionalTypePrice: 5, tone: "milk" },
  { id: "palitaw", name: "Palitaw", description: "A combination of sugar, niyog, and sesame seeds.", imageSrc: "/images/products/coatings/palitaw.jpeg", additionalTypePrice: 5, tone: "palitaw" },
  { id: "crushed-nuts", name: "Crushed Nuts", description: "A crunchy crushed-nut coating for added texture.", imageSrc: "/images/products/coatings/crushed-nuts.jpeg", additionalTypePrice: 5, tone: "nuts" },
  { id: "plain", name: "Plain", description: "The soft Litaw exterior with no additional coating.", imageSrc: "/images/products/coatings/plain.jpeg", additionalTypePrice: 5, tone: "plain" },
  { id: "sesame", name: "Sesame Seeds", description: "A toasted sesame seed coating with a nutty aroma.", imageSrc: "/images/products/coatings/sesame-seeds.jpeg", additionalTypePrice: 5, tone: "sesame" },
  { id: "cookies-cream", name: "Cookies and Cream", description: "Crushed chocolate cookies blended with a creamy coating.", imageSrc: "/images/products/coatings/cookies-and-cream.jpeg", additionalTypePrice: 5, tone: "cookies-cream" },
];

export const INITIAL_EXTRA_COATING_PRICE = COATINGS[0].additionalTypePrice;
export const EXTRA_SAUCE_PRICE = 18;

export function calculateExtraCoatingCharge(
  coatingCounts: Readonly<Record<string, number>>,
  additionalTypePrice: number = INITIAL_EXTRA_COATING_PRICE,
) {
  const distinctTypes = Object.values(coatingCounts).filter((count) => count > 0).length;
  return Math.max(0, distinctTypes - 1) * additionalTypePrice;
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
  extraSauceQuantity: number,
  extraSaucePrice: number = EXTRA_SAUCE_PRICE,
) {
  return boxPrice + extraCoatingCharge + extraSauceQuantity * extraSaucePrice;
}

type PricedCartLine = Pick<
  CartLineItem,
  "boxPrice" | "extraCoatingCharge" | "extraSauceQuantity" | "extraSaucePrice" | "quantity"
>;

export function calculateCartLineTotal(item: PricedCartLine) {
  return calculateItemUnitTotal(
    item.boxPrice,
    item.extraCoatingCharge,
    item.extraSauceQuantity,
    item.extraSaucePrice,
  ) * item.quantity;
}
