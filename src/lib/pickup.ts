export const PICKUP_DATES = [
  { value: "2026-09-05", label: "Saturday, September 5, 2026", adminLabel: "Saturday, Sep 5, 2026" },
  { value: "2026-09-07", label: "Monday, September 7, 2026", adminLabel: "Monday, Sep 7, 2026" },
] as const;

export const PICKUP_TIMES = ["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"].map((label) => ({ value: label, label }));

export const PICKUP_LOCATIONS = [
  { value: "social-hall", label: "UCC North Congress Campus — Social Hall", shortLabel: "Social Hall" },
  { value: "court", label: "UCC North Congress Campus — Court", shortLabel: "Court" },
] as const;

export const PICKUP_LEAD_DAYS = 1;
export const PICKUP_GRACE_MINUTES = 15;
