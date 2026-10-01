export const REVIEW_HIGHLIGHTS = [
  "Rich cocoa flavor",
  "Soft and chewy",
  "Balanced sweetness",
  "Fresh at pickup",
  "Neatly packed",
  "Would order again",
] as const;

// Leave room for the other form fields and Server Action multipart overhead.
export const MAX_REVIEW_SUBMISSION_IMAGE_BYTES = 3.5 * 1024 * 1024;

export interface ReviewOrderItemSummary {
  name: string;
  quantity: number;
  coatings: string[];
}
