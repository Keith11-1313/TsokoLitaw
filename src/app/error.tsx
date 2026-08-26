"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { PrimaryButton, secondaryButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-background px-6" tabIndex={-1}>
      <section role="alert" className="w-full max-w-lg rounded-card border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="font-display text-3xl text-foreground">We couldn’t load this page</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Try again. If the problem continues, return home and contact TsokoLitaw support.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryButton type="button" onClick={reset}><RotateCcw aria-hidden="true" size={17} />Try again</PrimaryButton>
          <Link href="/" className={cn(secondaryButtonClassName)}>Return home</Link>
        </div>
      </section>
    </main>
  );
}
