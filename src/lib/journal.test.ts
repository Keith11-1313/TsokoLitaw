import { describe, expect, it } from "vitest";
import { getJournalCardContentPreview, getJournalCardSummary } from "./journal";

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

  it("provides a richer body preview when the excerpt is shorter than the post", () => {
    const content = `First useful paragraph.\n\nSecond paragraph with more detail.`;

    expect(getJournalCardContentPreview("Short summary.", content)).toBe(content);
  });

  it("does not repeat content that is identical to the excerpt", () => {
    expect(getJournalCardContentPreview("Same text.", " Same   text. ")).toBeNull();
  });

  it("bounds longer body previews at a word boundary", () => {
    const preview = getJournalCardContentPreview(
      "Short summary.",
      "Detailed content ".repeat(80),
      120,
    );

    expect(preview).not.toBeNull();
    expect(preview!.length).toBeLessThanOrEqual(121);
    expect(preview).toMatch(/…$/);
  });
});
