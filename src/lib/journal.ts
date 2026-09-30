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

export function getJournalCardSummary(excerpt: string | null, content: string, maxLength = 180) {
  const summary = (excerpt?.trim() || content.trim()).replace(/\s+/g, " ");
  if (summary.length <= maxLength) return summary;

  const candidate = summary.slice(0, maxLength + 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const end = lastSpace >= Math.floor(maxLength * 0.7) ? lastSpace : maxLength;
  return `${summary.slice(0, end).trimEnd()}…`;
}

export function getJournalCardContentPreview(
  excerpt: string | null,
  content: string,
  maxLength = 520,
) {
  const normalizedExcerpt = excerpt?.trim().replace(/\s+/g, " ") ?? "";
  const normalizedContent = content
    .trim()
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

  if (!normalizedContent || normalizedContent === normalizedExcerpt) return null;
  if (normalizedContent.length <= maxLength) return normalizedContent;

  const candidate = normalizedContent.slice(0, maxLength + 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const end = lastSpace >= Math.floor(maxLength * 0.7) ? lastSpace : maxLength;
  return `${normalizedContent.slice(0, end).trimEnd()}…`;
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
