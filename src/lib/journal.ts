export const JOURNAL_CONTENT_TYPES = ["announcement", "story", "product_feature"] as const;

export const JOURNAL_STATUSES = ["draft", "published"] as const;
export const JOURNAL_COVER_FORMATS = ["landscape", "square", "portrait"] as const;

export type JournalContentType = (typeof JOURNAL_CONTENT_TYPES)[number];
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];
export type JournalCoverFormat = (typeof JOURNAL_COVER_FORMATS)[number];

export const journalContentTypeLabels: Record<JournalContentType, string> = {
  announcement: "Announcement",
  story: "Story",
  product_feature: "Product feature",
};

export const journalCoverFormatLabels: Record<JournalCoverFormat, string> = {
  landscape: "Landscape (16:9)",
  square: "Square (1:1)",
  portrait: "Portrait (4:5)",
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

export function isJournalCoverFormat(value: string): value is JournalCoverFormat {
  return JOURNAL_COVER_FORMATS.includes(value as JournalCoverFormat);
}
