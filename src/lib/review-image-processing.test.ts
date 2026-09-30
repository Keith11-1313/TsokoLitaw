// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { heicTo } from "heic-to/csp";
import { prepareReviewImages } from "./review-image-processing";

vi.mock("heic-to/csp", () => ({ heicTo: vi.fn() }));

const close = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 3000, height: 2000, close }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    callback(new Blob([new Uint8Array(500_000)], { type: "image/webp" }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  close.mockClear();
});

describe("review image preparation", () => {
  it("converts camera photos to bounded WebP files", async () => {
    const photos = [
      new File(["photo"], "first.JPG", { type: "image/jpeg" }),
      new File(["photo"], "second.png", { type: "image/png" }),
    ];
    const result = await prepareReviewImages(photos);

    expect(result.map((file) => file.name)).toEqual(["first.webp", "second.webp"]);
    expect(result.every((file) => file.type === "image/webp" && file.size <= 500_000)).toBe(true);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("decodes HEIC locally before preparing a supported upload", async () => {
    vi.mocked(
      heicTo as (input: { blob: Blob; type: "bitmap" }) => Promise<ImageBitmap>,
    ).mockResolvedValueOnce({ width: 3000, height: 2000, close } as ImageBitmap);
    const result = await prepareReviewImages([
      new File(["heic"], "camera.heic", { type: "image/heic" }),
    ]);

    expect(heicTo).toHaveBeenCalledOnce();
    expect(result[0].name).toBe("camera.webp");
    expect(result[0].type).toBe("image/webp");
  });

  it("rejects unsupported or uncompressible files with a clear error", async () => {
    await expect(
      prepareReviewImages([new File(["pdf"], "document.pdf", { type: "application/pdf" })]),
    ).rejects.toThrow("choose a HEIC, HEIF, JPG, PNG, or WebP image");

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([new Uint8Array(4 * 1024 * 1024)], { type: "image/webp" }));
    });
    await expect(
      prepareReviewImages([new File(["photo"], "large.jpg", { type: "image/jpeg" })]),
    ).rejects.toThrow("cannot fit at a usable quality");
    expect(close).toHaveBeenCalledOnce();
  });
});
