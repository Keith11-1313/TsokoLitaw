import { Link2 } from "lucide-react";
import { SiteContainer } from "@/components/layout/site-container";
import { BrandLockup } from "@/components/ui/brand-lockup";

interface CustomerFooterProps {
  address?: string;
  supportEmail?: string;
  socialLabels?: string[];
}

export function CustomerFooter({
  address = "UCC North Congress Campus, Caloocan",
  supportEmail = "Support email to be confirmed",
  socialLabels = ["Facebook", "Instagram", "X"],
}: CustomerFooterProps) {
  return (
    <footer className="bg-brand py-14 text-surface sm:py-16">
      <SiteContainer>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_auto] lg:gap-20">
          <div className="max-w-sm">
            <BrandLockup inverted showMark={false} />
            <p className="mt-5 text-sm leading-6 text-surface/80">
              Filipino chocolate-filled litaw, handmade in small batches with
              thoughtfully selected ingredients.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-surface">
              Location &amp; contact
            </h2>
            <address className="mt-5 space-y-2 text-sm not-italic leading-6 text-surface/80">
              <p>{address}</p>
              <p>{supportEmail}</p>
            </address>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-surface">
              Follow our story
            </h2>
            <div className="mt-5 flex gap-3" aria-label="Social links coming soon">
              {socialLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex size-10 items-center justify-center rounded-full bg-surface/10 text-surface/80"
                  title={`${label} link coming soon`}
                >
                  <Link2 aria-hidden="true" size={17} />
                  <span className="sr-only">{label} link coming soon</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-surface/15 pt-8 text-xs text-surface/70 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} TsokoLitaw. All rights reserved.</p>
          <p>Sweet treat. Happy beat.</p>
        </div>
      </SiteContainer>
    </footer>
  );
}
