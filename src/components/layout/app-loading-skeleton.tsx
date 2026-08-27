"use client";

import { Skeleton } from "boneyard-js/react";

function LoadingFrame() {
  return (
    <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-surface-muted" />
            <div className="h-8 w-32 rounded-control bg-surface-muted" />
          </div>
          <nav aria-label="Loading navigation" className="hidden items-center gap-5 sm:flex">
            <div className="h-4 w-16 rounded-full bg-surface-muted" />
            <div className="h-4 w-24 rounded-full bg-surface-muted" />
            <div className="h-4 w-16 rounded-full bg-surface-muted" />
            <div className="size-10 rounded-full bg-surface-muted" />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="h-12 w-56 rounded-control bg-surface-muted sm:w-72" />
        <div className="mt-4 h-5 max-w-xl rounded-control bg-surface-muted" />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-3 border-b border-border pb-5">
              <div className="size-11 rounded-full bg-surface-muted" />
              <div className="h-8 w-44 rounded-control bg-surface-muted" />
            </div>
            <div className="mt-7 space-y-6">
              {["w-24", "w-28", "w-40"].map((width) => (
                <div key={width}>
                  <div className={`h-4 ${width} rounded-full bg-surface-muted`} />
                  <div className="mt-3 h-14 w-full rounded-control bg-surface-muted" />
                </div>
              ))}
            </div>
            <div className="mt-7 h-12 w-36 rounded-full bg-surface-muted" />
          </section>
          <aside className="space-y-5">
            {["h-48", "h-56", "h-44"].map((height) => (
              <div key={height} className={`${height} rounded-card border border-border bg-surface p-6`}>
                <div className="h-7 w-40 rounded-control bg-surface-muted" />
                <div className="mt-4 h-4 w-full rounded-full bg-surface-muted" />
                <div className="mt-2 h-4 w-4/5 rounded-full bg-surface-muted" />
              </div>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}

export function AppLoadingSkeleton() {
  return (
    <div className="delayed-route-loading" role="status" aria-label="Loading page" aria-busy="true">
      <span className="sr-only">Loading page…</span>
      <Skeleton
        name="tsokolitaw-page"
        loading
        fixture={<LoadingFrame />}
        fallback={<LoadingFrame />}
        color="#eadfce"
        animate="shimmer"
        select="viewport"
      >
        <LoadingFrame />
      </Skeleton>
    </div>
  );
}
