import { PackageOpen } from "lucide-react";
import Link from "next/link";

export function OrdersList() {
  return (
    <section className="py-14 text-center" aria-labelledby="order-history-status">
      <PackageOpen className="mx-auto text-brand" aria-hidden="true" size={36} />
      <h2 id="order-history-status" className="mt-5 font-display text-3xl text-foreground">
        No online orders yet
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Your real purchases will appear here once online checkout and order tracking are available.
      </p>
      <Link
        href="/our-creations"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-6 text-sm font-bold text-brand transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Explore our creations
      </Link>
    </section>
  );
}
