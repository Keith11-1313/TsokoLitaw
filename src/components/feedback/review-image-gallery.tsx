"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ReviewImageGallery({
  reviewId,
  imageCount,
}: {
  reviewId: string;
  imageCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [expanded]);
  if (imageCount < 1) return null;
  const unavailable = failed.includes(index);
  const imageSrc = `/api/review-images/${reviewId}?index=${index}`;
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
          <button
            type="button"
            aria-label={`View review image ${index + 1} full screen`}
            onClick={() => setExpanded(true)}
            className="absolute inset-0 size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
          >
            <Image
              src={imageSrc}
              alt={`Customer review image ${index + 1} of ${imageCount}`}
              fill
              unoptimized
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-contain"
              onError={() =>
                setFailed((current) => (current.includes(index) ? current : [...current, index]))
              }
            />
          </button>
        )}
        {imageCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous review image"
              onClick={() => setIndex((index - 1 + imageCount) % imageCount)}
              className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-brand drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next review image"
              onClick={() => setIndex((index + 1) % imageCount)}
              className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-brand drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {imageCount > 1 ? (
        <div className="mt-2 flex justify-center gap-2" aria-label="Review image position">
          <span className="sr-only" aria-live="polite">
            Image {index + 1} of {imageCount}
          </span>
          {Array.from({ length: imageCount }, (_, imageIndex) => (
            <span
              key={imageIndex}
              aria-hidden="true"
              className={`size-2 rounded-full ${imageIndex === index ? "bg-brand" : "bg-brand/35"}`}
            />
          ))}
        </div>
      ) : null}
      {expanded
        ? createPortal(
            <dialog
              ref={dialogRef}
              aria-label={`Review image ${index + 1} of ${imageCount}`}
              onClose={() => setExpanded(false)}
              onClick={(event) => {
                if (event.target === event.currentTarget) setExpanded(false);
              }}
              className="fixed inset-0 m-auto w-[calc(100vw-1.5rem)] max-w-6xl overflow-hidden rounded-card border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-foreground/65 sm:w-[calc(100vw-3rem)]"
            >
              <div className="flex h-[min(90dvh,52rem)] min-h-0 flex-col">
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2 sm:px-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Community photo
                    </p>
                    <p className="font-display text-lg text-brand">Customer review</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close full-screen review image"
                    onClick={() => setExpanded(false)}
                    className="grid size-11 shrink-0 place-items-center rounded-control text-brand hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>
                <div className="relative min-h-0 flex-1 bg-surface-muted p-3 sm:p-6">
                  {unavailable ? (
                    <div className="grid size-full place-items-center">Image unavailable</div>
                  ) : (
                    <Image
                      src={imageSrc}
                      alt={`Customer review image ${index + 1} of ${imageCount}`}
                      fill
                      unoptimized
                      sizes="(min-width: 1152px) 1152px, 95vw"
                      className="object-contain"
                    />
                  )}
                </div>
                {imageCount > 1 ? (
                  <div className="flex shrink-0 items-center justify-center gap-4 border-t border-border px-4 py-2 sm:gap-6">
                    <button
                      type="button"
                      aria-label="Previous full-screen review image"
                      onClick={() => setIndex((index - 1 + imageCount) % imageCount)}
                      className="grid size-11 place-items-center rounded-control border border-border bg-surface-control text-brand hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <span className="sr-only" aria-live="polite">
                      Image {index + 1} of {imageCount}
                    </span>
                    <span className="flex items-center gap-2" aria-hidden="true">
                      {Array.from({ length: imageCount }, (_, imageIndex) => (
                        <span
                          key={imageIndex}
                          className={`size-2 rounded-full ${imageIndex === index ? "bg-brand" : "bg-brand/35"}`}
                        />
                      ))}
                    </span>
                    <button
                      type="button"
                      aria-label="Next full-screen review image"
                      onClick={() => setIndex((index + 1) % imageCount)}
                      className="grid size-11 place-items-center rounded-control border border-border bg-surface-control text-brand hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </div>
  );
}
