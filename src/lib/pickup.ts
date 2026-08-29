export const PICKUP_DATES = [
  { value: "2026-09-05", label: "Saturday, September 5, 2026", adminLabel: "Saturday, Sep 5, 2026" },
  { value: "2026-09-07", label: "Monday, September 7, 2026", adminLabel: "Monday, Sep 7, 2026" },
] as const;

export const PICKUP_OPERATING_DAYS = "Monday–Saturday";
export const PICKUP_OPERATING_HOURS = "7:00 AM–7:00 PM";
export const PICKUP_DAILY_CUTOFF = "5:00 PM";
export const PICKUP_SLOT_INTERVAL_MINUTES = 60;

export const PICKUP_TIMES = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
].map((label) => ({ value: label, label }));

export const PICKUP_LOCATIONS = [
  { value: "congress-third-floor", label: "UCC Congress — 3rd Floor", shortLabel: "3rd Floor" },
  { value: "congress-covered-court", label: "UCC Congress — Covered Court", shortLabel: "Covered Court" },
] as const;

export const PICKUP_LEAD_DAYS = 1;
export const PICKUP_GRACE_MINUTES = 15;
