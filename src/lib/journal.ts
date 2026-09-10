export const JOURNAL_CONTENT_TYPES = ["announcement", "story", "product_feature", "video"] as const;

export const JOURNAL_ICON_KEYS = ["megaphone", "sparkles", "file_text", "video"] as const;

export const JOURNAL_STATUSES = ["draft", "published"] as const;

export type JournalContentType = (typeof JOURNAL_CONTENT_TYPES)[number];
export type JournalIconKey = (typeof JOURNAL_ICON_KEYS)[number];
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const journalContentTypeLabels: Record<JournalContentType, string> = {
  announcement: "Announcement",
  story: "Story",
  product_feature: "Product feature",
  video: "Video",
};

export const legacyJournalIconForContentType: Record<JournalContentType, JournalIconKey> = {
  announcement: "megaphone",
  story: "file_text",
  product_feature: "sparkles",
  video: "video",
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
