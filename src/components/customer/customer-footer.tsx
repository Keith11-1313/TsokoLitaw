import { Link2 } from "lucide-react";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { cn } from "@/lib/cn";

interface CustomerFooterProps {
  address?: string;
  supportEmail?: string;
  className?: string;
}

export function CustomerFooter({
  address = "UCC North Congress Campus, Caloocan",
  supportEmail = "tsokolitaw@gmail.com",
  className,
}: CustomerFooterProps) {
  return (
    <footer
      className={cn(
        "bg-brand py-14 text-surface sm:py-16 lg:py-[4.5rem]",
        className,
      )}
    >
      <SiteContainer>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_auto] lg:gap-20">
          <div className="max-w-sm">
            <BrandLockup
              inverted
              showSubtitle={false}
              titleClassName="text-3xl"
            />
            <p className="mt-5 text-sm leading-6 text-surface/80">
              Specializing in chocolate-filled litaw (mochi-like rice cakes)
              crafted with premium local ingredients. A modern Filipino classic.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-surface">
              Location &amp; contact
            </h2>
            <address className="mt-5 space-y-2 text-sm not-italic leading-6 text-surface/80">
              <p>{address}</p>
              <a className="underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </address>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-surface">
              Follow our story
            </h2>
            <a
              href="https://www.facebook.com/profile.php?id=61593123463925"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface/10 px-4 text-sm font-bold text-surface transition-colors hover:bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface"
            >
              <Link2 aria-hidden="true" size={17} />
              Facebook
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-surface/15 pt-8 text-xs text-surface/70 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} TsokoLitaw. All rights reserved.</p>
          <nav className="flex flex-wrap gap-4" aria-label="Legal"><Link className="underline-offset-4 hover:underline" href="/terms">Terms &amp; Conditions</Link><Link className="underline-offset-4 hover:underline" href="/privacy">Privacy</Link></nav>
        </div>
      </SiteContainer>
    </footer>
  );
}
