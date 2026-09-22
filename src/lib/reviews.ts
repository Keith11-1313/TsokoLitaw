export const REVIEW_HIGHLIGHTS = [
  "Rich cocoa flavor",
  "Soft and chewy",
  "Balanced sweetness",
  "Fresh at pickup",
  "Neatly packed",
  "Would order again",
] as const;

export interface ReviewOrderItemSummary {
  name: string;
  quantity: number;
  coatings: string[];
}
