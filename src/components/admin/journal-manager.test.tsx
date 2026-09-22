// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalManager } from "@/components/admin/journal-manager";
import { browserImageError } from "@/lib/form-validation";

vi.mock("@/app/admin/journal/actions", () => ({
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
});
