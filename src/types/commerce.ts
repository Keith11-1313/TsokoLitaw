export interface BoxVariant {
  id: string;
  label: string;
  pieceCount: 4 | 6 | 8;
  price: number;
}

export interface Coating {
  id: string;
  name: string;
  description: string;
  imageSrc: string;
  additionalTypePrice: number;
  tone:
    | "cocoa-coating"
    | "milk"
    | "palitaw"
    | "nuts"
    | "plain"
    | "sesame"
    | "cookies-cream";
}

export interface CommerceAddon {
  id: string;
  name: string;
  slug: string;
  price: number;
}

export interface CommerceCatalog {
  productId: string;
  productName: string;
  productDescription: string;
  piecePrice: number;
  variants: readonly BoxVariant[];
  coatings: readonly Coating[];
  addons: readonly CommerceAddon[];
}

export interface CartLineItem {
  id: string;
  variantId: BoxVariant["id"];
  pieceCount: number;
  boxPrice: number;
  coatingCounts: Record<string, number>;
  coatingNames: Record<string, string>;
  extraCoatingCharge: number;
  addonId: string | null;
  addonName: string | null;
  addonQuantity: number;
  addonPrice: number;
  quantity: number;
}

export interface CheckoutCartInput {
  variantId: string;
  coatingCounts: Record<string, number>;
  addonId: string | null;
  addonQuantity: number;
  quantity: number;
}

export interface ServerPricedCartLine {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  pieceCount: number;
  baseUnitPrice: number;
  extraCoatingTotal: number;
  quantity: number;
  lineSubtotal: number;
  coatings: Array<{
    id: string;
    name: string;
    pieceCount: number;
    additionalPrice: number;
    isIncludedType: boolean;
  }>;
  addon: {
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  } | null;
}

export interface ServerPricedCart {
  lines: ServerPricedCartLine[];
  subtotal: number;
}
