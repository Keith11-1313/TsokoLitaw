export const JOURNAL_CONTENT_TYPES = ["announcement", "story", "product_feature", "video"] as const;

export const JOURNAL_STATUSES = ["draft", "published"] as const;

export type JournalContentType = (typeof JOURNAL_CONTENT_TYPES)[number];
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const journalContentTypeLabels: Record<JournalContentType, string> = {
  announcement: "Announcement",
  story: "Story",
  product_feature: "Product feature",
  video: "Video",
};

export function getJournalCardSummary(excerpt: string | null, content: string) {
  const summary = (excerpt?.trim() || content.trim()).replace(/\s+/g, " ");
  if (summary.length <= 180) return summary;

  const candidate = summary.slice(0, 181);
  const lastSpace = candidate.lastIndexOf(" ");
  const end = lastSpace >= 120 ? lastSpace : 180;
  return `${summary.slice(0, end).trimEnd()}…`;
}

export function isJournalContentType(value: string): value is JournalContentType {
  return JOURNAL_CONTENT_TYPES.includes(value as JournalContentType);
}

export function isJournalStatus(value: string): value is JournalStatus {
  return JOURNAL_STATUSES.includes(value as JournalStatus);
}
