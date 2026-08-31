import "server-only";

import sharp, { type Metadata } from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, formatFileSize } from "@/lib/form-validation";

const formatByMime: Record<string, "jpeg" | "png" | "webp"> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function validateUploadedImage(file: File, options: { requireSquare?: boolean; label?: string } = {}) {
  const label = options.label ?? "image";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error(`Choose a JPG, PNG, or WebP ${label}.`);
  if (file.size <= 0) throw new Error(`Choose a non-empty ${label} file.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`This ${label} is ${formatFileSize(file.size)}. Choose one no larger than 3 MB.`);

  const buffer = Buffer.from(await file.arrayBuffer());
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error" }).metadata();
  } catch (cause) {
    throw new Error(`The ${label} could not be decoded. Choose a valid JPG, PNG, or WebP file.`, { cause });
  }

  const expectedFormat = formatByMime[file.type];
  if (!metadata.width || !metadata.height || metadata.format !== expectedFormat) {
    throw new Error(`The ${label} contents do not match its declared file type.`);
  }
  if (options.requireSquare && metadata.width !== metadata.height) {
    throw new Error(`Use a square 1:1 image. This file is ${metadata.width} × ${metadata.height}px.`);
  }

  return {
    buffer,
    contentType: file.type,
    extension: expectedFormat === "jpeg" ? "jpg" : expectedFormat,
    width: metadata.width,
    height: metadata.height,
  };
}
