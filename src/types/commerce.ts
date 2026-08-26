export interface BoxVariant {
  id: "box-4" | "box-6" | "box-8";
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

export interface CartLineItem {
  id: string;
  variantId: BoxVariant["id"];
  pieceCount: number;
  boxPrice: number;
  coatingCounts: Record<string, number>;
  coatingNames: Record<string, string>;
  extraCoatingCharge: number;
  extraSauceQuantity: number;
  extraSaucePrice: number;
  quantity: number;
}
