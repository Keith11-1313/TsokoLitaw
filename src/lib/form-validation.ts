export type FieldErrors = Record<string, string>;

export interface ValidationResult {
  isValid: boolean;
  fieldErrors: FieldErrors;
}

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validationResult(fieldErrors: FieldErrors): ValidationResult {
  return { isValid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

export function textError(value: string, label: string, min: number, max: number) {
  const length = value.trim().length;
  if (length < min) return `${label} must contain at least ${min} characters.`;
  if (length > max) return `${label} cannot exceed ${max} characters.`;
  return "";
}

export function optionalTextError(value: string, label: string, max: number) {
  return value.trim().length > max ? `${label} cannot exceed ${max} characters.` : "";
}

export function numberError(
  value: string | number,
  label: string,
  min: number,
  max: number,
  step = 1,
) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return `Enter a valid ${label.toLowerCase()}.`;
  if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}.`;
  const stepCount = (parsed - min) / step;
  if (Math.abs(stepCount - Math.round(stepCount)) > 1e-8) {
    return `${label} must use increments of ${step}.`;
  }
  return "";
}

export function integerError(value: string | number, label: string, min: number, max: number) {
  const error = numberError(value, label, min, max, 1);
  if (error) return error;
  return Number.isInteger(Number(value)) ? "" : `${label} must be a whole number.`;
}

export function secureUrlError(value: string, label: string, required = false) {
  const normalized = value.trim();
  if (!normalized) return required ? `${label} is required.` : "";
  try {
    return new URL(normalized).protocol === "https:" ? "" : `${label} must use https://.`;
  } catch {
    return `Enter a valid ${label.toLowerCase()}.`;
  }
}

export function imageFileError(file: File | null | undefined) {
  if (!file || file.size === 0) return "";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) {
    return `This image is ${formatFileSize(file.size)}. Choose an image no larger than 3 MB.`;
  }
  return "";
}

export async function browserImageError(file: File, requireSquare = false) {
  const basicError = imageFileError(file);
  if (basicError) return basicError;
  const url = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("decode"));
      image.src = url;
    });
    if (!dimensions.width || !dimensions.height) return "This image has invalid dimensions and cannot be used.";
    if (requireSquare && dimensions.width !== dimensions.height) {
      return `Use a square 1:1 image. This file is ${dimensions.width} × ${dimensions.height}px.`;
    }
    return "";
  } catch {
    return "This file could not be decoded as a valid image.";
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function decimalPlaces(value: number) {
  const text = String(value);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

export function normalizeSteppedValue(value: number, min: number, max: number, step: number) {
  const precision = Math.max(decimalPlaces(step), decimalPlaces(min));
  const clamped = Math.min(max, Math.max(min, value));
  return Number(clamped.toFixed(precision));
}
