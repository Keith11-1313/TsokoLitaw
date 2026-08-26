import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-background px-6" tabIndex={-1}>
      <section className="w-full max-w-lg rounded-card border border-border bg-surface p-8 text-center shadow-sm">
        <p className="font-script text-5xl text-brand">Not found</p>
        <h1 className="mt-3 font-display text-3xl text-foreground">This page isn’t available</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The link may be outdated, or this order action may no longer be eligible.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={cn(primaryButtonClassName)}>Return home</Link>
          <Link href="/orders" className={cn(secondaryButtonClassName)}><ArrowLeft aria-hidden="true" size={17} />View orders</Link>
        </div>
      </section>
    </main>
  );
}
