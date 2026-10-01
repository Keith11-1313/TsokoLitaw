// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalManager } from "@/components/admin/journal-manager";
import { browserImageError } from "@/lib/form-validation";

vi.mock("@/app/admin/journal/actions", () => ({
  deleteJournalDraftAction: vi.fn(async () => ({ status: "idle", message: "" })),
  saveJournalPostAction: vi.fn(async () => ({ status: "idle", message: "" })),
}));

vi.mock("@/lib/form-validation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/form-validation")>()),
  browserImageError: vi.fn(),
}));

const createObjectUrl = vi.fn(() => "blob:journal-cover-preview");
const revokeObjectUrl = vi.fn();

beforeEach(() => {
  vi.mocked(browserImageError).mockResolvedValue("");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectUrl,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("JournalManager", () => {
  const draftPost = {
    id: "e1000000-0000-4000-8000-000000000010",
    title: "A draft announcement",
    slug: "a-draft-announcement-e1000000",
    excerpt: "Draft summary",
    content: "Draft Journal content for the confirmation test.",
    contentType: "announcement" as const,
    displayDate: "2026-09-30",
    coverImageUrl: "https://example.test/draft.webp",
    coverFormat: "landscape" as const,
    status: "draft" as const,
    publishedAt: null,
  };

  it("closes a new untouched editor without validation or discard confirmation", async () => {
    render(<JournalManager posts={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New post" }));

    expect(screen.queryByText("Please fill out this field.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close Journal editor" }));

    expect(screen.queryByRole("dialog", { name: "Create post" })).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("previews and retains a newly selected cover before saving", async () => {
    const { unmount } = render(<JournalManager posts={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New post" }));

    const input = screen.getByLabelText("Cover image (optional)") as HTMLInputElement;
    const file = new File(["cover"], "journal-cover.webp", { type: "image/webp" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Cover image (optional) preview 1" })).toBeTruthy();
    });
    expect(createObjectUrl).toHaveBeenCalledWith(file);
    expect(input.files?.[0]).toBe(file);
    expect(screen.getByText("1 image selected")).toBeTruthy();

    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:journal-cover-preview");
  });

  it("defaults new covers to landscape and offers all supported formats", () => {
    render(<JournalManager posts={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New post" }));

    const formatSelect = screen.getByRole("combobox", { name: "Cover format" });
    expect(formatSelect.textContent).toContain("Landscape (16:9)");

    fireEvent.click(formatSelect);
    expect(screen.getByRole("option", { name: "Square (1:1)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Portrait (4:5)" })).toBeTruthy();
  });

  it("offers deletion only for drafts and requires an irreversible-action confirmation", () => {
    render(
      <JournalManager
        posts={[
          draftPost,
          {
            ...draftPost,
            id: "e1000000-0000-4000-8000-000000000011",
            title: "Published announcement",
            slug: "published-announcement-e1000000",
            status: "published",
            publishedAt: "2026-09-30T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Delete draft" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));

    expect(screen.getByRole("alertdialog", { name: "Delete this draft?" })).toBeTruthy();
    expect(screen.getByText(/This action cannot be undone\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep draft" })).toBeTruthy();
  });
});
