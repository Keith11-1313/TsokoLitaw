import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { cn } from "@/lib/cn";

interface CustomerFooterProps {
  address?: string;
  locationHref?: string;
  supportEmail?: string;
  className?: string;
}

export function CustomerFooter({
  address = "University of Caloocan City - Congressional Campus",
  locationHref = "https://maps.app.goo.gl/aVPtbAP5cFfZhjML8",
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
              Craving something sweet? Order your TsokoLitaw online and pick it up fresh on campus.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-surface">
              Location &amp; contact
            </h2>
            <address className="mt-5 space-y-2 text-sm not-italic leading-6 text-surface/80">
              <a
                className="block underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface"
                href={locationHref}
                target="_blank"
                rel="noreferrer"
              >
                {address}
              </a>
              <a className="underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </address>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-surface">
              Stay connected
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61593123463925"
                target="_blank"
                rel="noreferrer"
                aria-label="TsokoLitaw on Facebook"
                className="inline-flex size-11 items-center justify-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface"
              >
                <FacebookIcon />
              </a>
              <a
                href="https://www.instagram.com/tsokolitaw/"
                target="_blank"
                rel="noreferrer"
                aria-label="TsokoLitaw on Instagram"
                className="inline-flex size-11 items-center justify-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface"
              >
                <InstagramIcon />
              </a>
            </div>
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

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="size-[17px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1.01.28-1.7 1.73-1.7H17V2.14C16.69 2.1 15.62 2 14.36 2c-2.63 0-4.43 1.6-4.43 4.54V9.5H7V13h2.93v9h3.57Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[17px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
