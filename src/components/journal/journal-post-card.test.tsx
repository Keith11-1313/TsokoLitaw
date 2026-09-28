// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JournalPostCard } from "@/components/journal/journal-post-card";
import type { JournalPostSummary } from "@/lib/server-journal";

function postWithFormat(coverFormat: JournalPostSummary["coverFormat"]): JournalPostSummary {
  return {
    id: `${coverFormat}-post`,
    title: `${coverFormat} Journal post`,
    slug: `${coverFormat}-journal-post`,
    excerpt: "A short Journal card summary.",
    content: "A fuller Journal post body with useful details beyond the short card summary.",
    contentType: "story",
    displayDate: "2026-09-28",
    coverImageUrl: `/images/journal/${coverFormat}.webp`,
    coverFormat,
    status: "published",
    publishedAt: "2026-09-28T00:00:00.000Z",
  };
}

afterEach(cleanup);

describe("JournalPostCard", () => {
  it("places square media beside its copy on larger breakpoints", () => {
    render(<JournalPostCard post={postWithFormat("square")} />);

    expect(screen.getByRole("article").className).toContain("lg:grid");
    expect(screen.getByRole("article").className).toContain("minmax(16rem,0.65fr)");
  });

  it("places portrait media beside its copy on larger screens", () => {
    render(<JournalPostCard post={postWithFormat("portrait")} />);

    expect(screen.getByRole("article").className).toContain("lg:grid");
    expect(screen.getByRole("article").className).toContain("minmax(16rem,0.65fr)");
  });

  it("places landscape copy before its media on larger screens", () => {
    render(<JournalPostCard post={postWithFormat("landscape")} />);

    expect(screen.getByRole("article").className).toContain("lg:grid");
    expect(screen.getByText("A short Journal card summary.").className).toContain(
      "text-muted-foreground",
    );
    expect(
      screen.getByText(
        "A fuller Journal post body with useful details beyond the short card summary.",
      ).className,
    ).toContain("lg:line-clamp-4");
  });

  it("renders one separated action row", () => {
    render(<JournalPostCard post={postWithFormat("landscape")} />);

    expect(screen.getAllByRole("link", { name: "Read post" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Read post" }).parentElement?.className).toContain(
      "border-t",
    );
  });

  it.each(["landscape", "square", "portrait"] as const)(
    "uses available body content in %s cards",
    (format) => {
      render(<JournalPostCard post={postWithFormat(format)} />);

      expect(
        screen.getByText(
          "A fuller Journal post body with useful details beyond the short card summary.",
        ),
      ).toBeTruthy();
    },
  );
});
