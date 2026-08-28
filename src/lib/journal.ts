export const JOURNAL_CONTENT_TYPES = [
  "announcement",
  "story",
  "product_feature",
  "video",
] as const;

export const JOURNAL_ICON_KEYS = [
  "megaphone",
  "sparkles",
  "file_text",
  "video",
] as const;

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

export const journalIconLabels: Record<JournalIconKey, string> = {
  megaphone: "Megaphone",
  sparkles: "Sparkles",
  file_text: "Article",
  video: "Video",
};

export function isJournalContentType(value: string): value is JournalContentType {
  return JOURNAL_CONTENT_TYPES.includes(value as JournalContentType);
}

export function isJournalIconKey(value: string): value is JournalIconKey {
  return JOURNAL_ICON_KEYS.includes(value as JournalIconKey);
}

export function isJournalStatus(value: string): value is JournalStatus {
  return JOURNAL_STATUSES.includes(value as JournalStatus);
}
