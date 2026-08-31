import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let validateUploadedImage: typeof import("./server-image-validation").validateUploadedImage;

beforeAll(async () => {
  ({ validateUploadedImage } = await import("./server-image-validation"));
});

describe("server image validation", () => {
  it("rejects corrupt image contents even when the MIME type is allowed", async () => {
    const file = new File(["not an image"], "fake.jpg", { type: "image/jpeg" });
    await expect(validateUploadedImage(file)).rejects.toThrow("could not be decoded");
  });

  it("rejects a non-square coating image after decoding it", async () => {
    const sharp = (await import("sharp")).default;
    const bytes = await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer();
    const file = new File([bytes], "wide.jpg", { type: "image/jpeg" });
    await expect(validateUploadedImage(file, { requireSquare: true })).rejects.toThrow("20 × 10px");
  });

  it("accepts a valid square image and returns trusted upload metadata", async () => {
    const sharp = (await import("sharp")).default;
    const bytes = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
    const file = new File([bytes], "square.png", { type: "image/png" });
    const result = await validateUploadedImage(file, { requireSquare: true });
    expect(result).toMatchObject({ width: 10, height: 10, extension: "png", contentType: "image/png" });
  });
});
