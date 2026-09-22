"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useState } from "react";

export function ReviewImageGallery({
  reviewId,
  imageCount,
}: {
  reviewId: string;
  imageCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  if (imageCount < 1) return null;
  const unavailable = failed.includes(index);
  return (
    <div className="mt-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-control bg-surface-muted">
        {unavailable ? (
          <div className="grid size-full place-items-center text-center text-sm text-muted-foreground">
            <span>
              <ImageOff className="mx-auto mb-2" aria-hidden="true" />
              Image unavailable
            </span>
          </div>
        ) : (
          <Image
            src={`/api/review-images/${reviewId}?index=${index}`}
            alt={`Customer review image ${index + 1} of ${imageCount}`}
            fill
            unoptimized
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            onError={() =>
              setFailed((current) => (current.includes(index) ? current : [...current, index]))
            }
          />
        )}
        {imageCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous review image"
              onClick={() => setIndex((index - 1 + imageCount) % imageCount)}
              className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-brand shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next review image"
              onClick={() => setIndex((index + 1) % imageCount)}
              className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-brand shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {imageCount > 1 ? (
        <p className="mt-2 text-center text-xs font-bold text-muted-foreground" aria-live="polite">
          Image {index + 1} of {imageCount}
        </p>
      ) : null}
    </div>
  );
}
