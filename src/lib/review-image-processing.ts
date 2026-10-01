import { MAX_REVIEW_SUBMISSION_IMAGE_BYTES } from "@/lib/reviews";
import { MAX_IMAGE_BYTES } from "@/lib/form-validation";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const SOURCE_EXTENSIONS = /\.(?:heic|heif|jpe?g|png|webp)$/i;
const HEIC_EXTENSIONS = /\.(?:heic|heif)$/i;
const SOURCE_TYPES = new Set(["image/heic", "image/heif", "image/jpeg", "image/png", "image/webp"]);

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be prepared."))),
      type,
      quality,
    );
  });
}

async function encodePhoto(
  bitmap: ImageBitmap,
  maxBytes: number,
): Promise<{ blob: Blob; extension: string }> {
  for (const [maxDimension, quality] of [
    [1600, 0.82],
    [1440, 0.76],
    [1280, 0.7],
    [1100, 0.64],
    [960, 0.6],
  ]) {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This device cannot prepare review images.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob = await toBlob(canvas, "image/webp", quality);
    if (blob.type !== "image/webp") {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
    if (
      blob.size > 0 &&
      blob.size <= maxBytes &&
      (blob.type === "image/webp" || blob.type === "image/jpeg")
    ) {
      const result = { blob, extension: blob.type === "image/webp" ? "webp" : "jpg" };
      canvas.width = 0;
      canvas.height = 0;
      return result;
    }
    canvas.width = 0;
    canvas.height = 0;
  }
  throw new Error("These photos cannot fit at a usable quality. Choose fewer or smaller photos.");
}

export async function prepareReviewImages(files: File[]): Promise<File[]> {
  if (files.length > 5) throw new Error("Choose no more than five review images.");
  if (!files.length) return [];

  const maxBytesPerImage = Math.min(
    MAX_IMAGE_BYTES,
    Math.floor(MAX_REVIEW_SUBMISSION_IMAGE_BYTES / files.length),
  );
  const prepared: File[] = [];
  for (const file of files) {
    if (
      !SOURCE_EXTENSIONS.test(file.name) ||
      (file.type && !SOURCE_TYPES.has(file.type) && file.type !== "application/octet-stream") ||
      !file.size ||
      file.size > MAX_SOURCE_BYTES
    ) {
      throw new Error(`${file.name}: choose a HEIC, HEIF, JPG, PNG, or WebP image up to 25 MB.`);
    }

    let bitmap: ImageBitmap;
    if (
      HEIC_EXTENSIONS.test(file.name) ||
      file.type === "image/heic" ||
      file.type === "image/heif"
    ) {
      try {
        const { heicTo } = await import("heic-to/csp");
        bitmap = await heicTo({ blob: file, type: "bitmap" });
      } catch {
        throw new Error(
          `${file.name}: this HEIC/HEIF photo could not be converted on this device.`,
        );
      }
    } else {
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw new Error(`${file.name}: this photo could not be opened. Choose another image.`);
      }
    }
    try {
      const { blob, extension } = await encodePhoto(bitmap, maxBytesPerImage);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      prepared.push(new File([blob], `${baseName}.${extension}`, { type: blob.type }));
    } finally {
      bitmap.close();
    }
  }
  return prepared;
}
