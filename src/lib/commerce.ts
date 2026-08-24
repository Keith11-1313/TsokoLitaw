import type { BoxVariant, Coating } from "@/types/commerce";

export const BOX_VARIANTS: readonly BoxVariant[] = [
  { id: "box-4", label: "Box of 4", pieceCount: 4, price: 60 },
  { id: "box-6", label: "Box of 6", pieceCount: 6, price: 85 },
  { id: "box-8", label: "Box of 8", pieceCount: 8, price: 110 },
];

export const COATINGS: readonly Coating[] = [
  { id: "cocoa", name: "Cocoa", description: "A rich cocoa coating over the chocolate-filled base.", imageSrc: "/images/products/coatings/cocoa.jpeg", tone: "cocoa-coating" },
  { id: "milk", name: "Milk", description: "A creamy milk coating with a soft, mellow finish.", imageSrc: "/images/products/coatings/milk.jpeg", tone: "milk" },
  { id: "palitaw", name: "Palitaw", description: "A combination of sugar, niyog, and sesame seeds.", imageSrc: "/images/products/coatings/palitaw.jpeg", tone: "palitaw" },
  { id: "crushed-nuts", name: "Crushed Nuts", description: "A crunchy crushed-nut coating for added texture.", imageSrc: "/images/products/coatings/crushed-nuts.jpeg", tone: "nuts" },
  { id: "plain", name: "Plain", description: "The soft Litaw exterior with no additional coating.", imageSrc: "/images/products/coatings/plain.jpeg", tone: "plain" },
  { id: "sesame", name: "Sesame Seeds", description: "A toasted sesame seed coating with a nutty aroma.", imageSrc: "/images/products/coatings/sesame-seeds.jpeg", tone: "sesame" },
  { id: "cookies-cream", name: "Cookies and Cream", description: "Crushed chocolate cookies blended with a creamy coating.", imageSrc: "/images/products/coatings/cookies-and-cream.jpeg", tone: "cookies-cream" },
];

export const EXTRA_COATING_PRICE = 5;
export const EXTRA_SAUCE_PRICE = 18;

export function formatPhp(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculateItemUnitTotal(boxPrice: number, extraCoatingCharge: number, extraSauceQuantity: number) {
  return boxPrice + extraCoatingCharge + extraSauceQuantity * EXTRA_SAUCE_PRICE;
}
