// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JournalPostMedia } from "@/components/journal/journal-post-media";
import type { JournalPostSummary } from "@/lib/server-journal";

function postWithFormat(coverFormat: JournalPostSummary["coverFormat"]): JournalPostSummary {
  return {
    id: "post-id",
    title: "TsokoLitaw selection",
    slug: "tsokolitaw-selection",
    excerpt: null,
    content: "A Journal post with a cover image.",
    contentType: "product_feature",
    displayDate: "2026-09-28",
    coverImageUrl: "/images/journal/selection.webp",
    coverFormat,
    status: "published",
    publishedAt: "2026-09-28T00:00:00.000Z",
  };
}

afterEach(cleanup);

describe("JournalPostMedia", () => {
  it.each([
    ["landscape", "aspect-video"],
    ["square", "aspect-square"],
    ["portrait", "aspect-[4/5]"],
  ] as const)("renders the selected %s frame without cropping", (format, expectedClass) => {
    render(<JournalPostMedia post={postWithFormat(format)} />);

    const media = screen.getByRole("img", { name: "Cover image for TsokoLitaw selection" });
    expect(media.className).toContain(expectedClass);
    expect(media.className).toContain("bg-contain");
  });

  it("bounds portrait media on the full post page", () => {
    render(<JournalPostMedia post={postWithFormat("portrait")} presentation="detail" />);

    const media = screen.getByRole("img", { name: "Cover image for TsokoLitaw selection" });
    expect(media.className).toContain("max-w-lg");
    expect(media.className).toContain("mx-auto");
  });
});
