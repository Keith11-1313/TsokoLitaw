"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const slideCount = 2;

export function FeaturedMediaCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (activeSlide !== 0) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    setMuted(true);
    void video.play().catch(() => {
      // Native controls remain available if a browser blocks autoplay.
    });
  }, [activeSlide]);

  function showSlide(index: number) {
    setActiveSlide((index + slideCount) % slideCount);
  }

  return (
    <section className="mx-auto w-full max-w-lg" aria-roledescription="carousel" aria-label="Featured TsokoLitaw media">
      <div className="relative overflow-hidden rounded-card border border-border bg-foreground shadow-sm">
        <div className="aspect-[9/16]">
          {activeSlide === 0 ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted={muted}
              playsInline
              controls
              preload="metadata"
              poster="/images/home/placeholder-portrait-9x16.jpg"
              aria-label="Featured TsokoLitaw product video"
              onEnded={() => showSlide(1)}
              onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
            >
              <source src="/videos/home/featured.mp4" type="video/mp4" />
              Your browser does not support embedded video.
            </video>
          ) : (
            <Link
              href="/our-creations"
              className="group relative block h-full w-full bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
              aria-label="View the TsokoLitaw selection in Our Creations"
            >
              <Image
                src="/images/home/featured-selection.png"
                alt="TsokoLitaw selection showing eight chocolate-filled Litaw coatings"
                fill
                sizes="(min-width: 640px) 32rem, calc(100vw - 2rem)"
                className="object-contain transition-transform duration-300 group-hover:scale-[1.01]"
              />
            </Link>
          )}
        </div>

        {activeSlide === 0 ? (
          <button
            type="button"
            onClick={() => setMuted((current) => !current)}
            className="absolute right-3 top-3 flex min-h-11 items-center gap-2 rounded-full bg-surface/95 px-4 text-xs font-bold text-brand shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={muted ? "Turn video sound on" : "Mute video"}
          >
            {muted ? <VolumeX aria-hidden="true" size={17} /> : <Volume2 aria-hidden="true" size={17} />}
            {muted ? "Sound off" : "Sound on"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => showSlide(activeSlide - 1)}
          className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-surface drop-shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Show previous featured item"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <button
          type="button"
          onClick={() => showSlide(activeSlide + 1)}
          className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-surface drop-shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Show next featured item"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {activeSlide === 0
          ? "Showing the featured TsokoLitaw video."
          : "Showing the TsokoLitaw selection photo."}
      </p>
    </section>
  );
}
