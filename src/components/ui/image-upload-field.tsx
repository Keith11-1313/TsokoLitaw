"use client";

import { ImageUp } from "lucide-react";
import type { ChangeEventHandler } from "react";
import { cn } from "@/lib/cn";

interface ImageUploadFieldProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  busy?: boolean;
  fileName?: string;
  previewUrl?: string;
  fileNames?: readonly string[];
  previewUrls?: readonly string[];
  multiple?: boolean;
  maxFiles?: number;
  error?: string;
  className?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export function ImageUploadField({
  id,
  name,
  label,
  required,
  disabled,
  busy,
  fileName,
  previewUrl,
  fileNames,
  previewUrls,
  multiple,
  maxFiles,
  error,
  className,
  onChange,
}: ImageUploadFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const selectedNames = fileNames ?? (fileName ? [fileName] : []);
  const selectedPreviews = previewUrls ?? (previewUrl ? [previewUrl] : []);
  const prompt = busy
    ? "Checking image…"
    : selectedNames.length
      ? `${selectedNames.length} image${selectedNames.length === 1 ? "" : "s"} selected`
      : "Drag and drop or browse";

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
        {required ? (
          <span className="ml-1 text-danger-foreground" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <label
        htmlFor={id}
        className={cn(
          "relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed bg-surface-muted px-6 py-6 text-center transition-colors hover:border-brand focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20",
          error ? "border-danger-foreground" : "border-border",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selectedPreviews.length ? (
          <span className="flex max-w-full flex-wrap justify-center gap-2">
            {selectedPreviews.map((url, index) => (
              <span
                key={url}
                role="img"
                aria-label={`${label} preview ${index + 1}`}
                className="size-20 rounded-control bg-cover bg-center"
                style={{ backgroundImage: `url(${url})` }}
              />
            ))}
          </span>
        ) : (
          <ImageUp aria-hidden="true" size={34} className="text-brand" />
        )}
        <span className="mt-3 max-w-full break-words font-bold text-foreground">{prompt}</span>
        <span className="mt-1 text-xs font-normal text-muted-foreground">
          JPG, PNG or WebP up to 3 MB{multiple && maxFiles ? ` each, up to ${maxFiles} images` : ""}
        </span>
        <input
          id={id}
          name={name}
          type="file"
          aria-label={label}
          aria-describedby={errorId}
          aria-invalid={Boolean(error) || undefined}
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          required={required}
          disabled={disabled}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={onChange}
        />
      </label>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-bold text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
