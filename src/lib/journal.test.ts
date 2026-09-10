import { describe, expect, it } from "vitest";
import { getJournalCardSummary, legacyJournalIconForContentType } from "./journal";

describe("Journal presentation", () => {
  it("uses the editor summary when one is available", () => {
    expect(getJournalCardSummary(" Short summary. ", "Full post content.")).toBe("Short summary.");
  });

  it("falls back to a compact plain-text content preview", () => {
    const content = `${"A useful Journal update ".repeat(12)}last sentence.`;
    const summary = getJournalCardSummary(null, content);

    expect(summary.length).toBeLessThanOrEqual(181);
    expect(summary).toMatch(/…$/);
    expect(summary).not.toContain("  ");
  });

  it("derives the legacy database icon from the post type", () => {
    expect(legacyJournalIconForContentType).toEqual({
      announcement: "megaphone",
      story: "file_text",
      product_feature: "sparkles",
      video: "video",
    });
  });
});
