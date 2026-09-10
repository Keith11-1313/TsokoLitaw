import { Menu } from "lucide-react";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { HeaderActions } from "@/components/customer/header-actions";
import { CustomerHeaderFrame } from "@/components/customer/customer-header-frame";
import { cn } from "@/lib/cn";
import { getAuthProfile } from "@/lib/auth";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/our-creations", label: "Our Creations" },
  { href: "/journal", label: "Journal" },
] as const;

interface CustomerHeaderProps {
  activePath?: string;
}

export async function CustomerHeader({ activePath }: CustomerHeaderProps) {
  const profile = await getAuthProfile();
  return (
    <CustomerHeaderFrame>
      <SiteContainer className="flex items-center justify-between gap-2 lg:gap-3">
        <Link
          href="/"
          aria-label="TsokoLitaw home"
          className="flex h-14 shrink-0 items-center rounded-full border border-border bg-surface/95 px-3 shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <BrandLockup showSubtitle={false} markClassName="size-11" className="gap-2.5" />
        </Link>

        <nav
          className="hidden h-14 items-center rounded-full border border-border bg-surface/95 p-1.5 shadow-sm backdrop-blur md:flex"
          aria-label="Main navigation"
        >
          {navigationItems.map((item) => {
            const isActive = activePath === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:px-4",
                  isActive && "bg-brand font-bold text-surface hover:bg-brand hover:text-surface",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden h-14 shrink-0 items-center rounded-full border border-border bg-surface/95 p-1.5 shadow-sm backdrop-blur md:flex">
          <HeaderActions isSignedIn={Boolean(profile)} isAdmin={profile?.role === "admin"} />
        </div>

        <details className="group relative md:hidden">
          <summary className="flex size-14 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-surface/95 text-brand shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" size={21} />
            <span className="sr-only">Open navigation</span>
          </summary>
          <div className="absolute right-0 top-16 w-72 rounded-card border border-border bg-surface p-4 shadow-xl shadow-brand/10">
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {navigationItems.map((item) => {
                const isActive = activePath === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-control px-4 py-3 text-sm text-muted-foreground hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      isActive && "bg-surface-muted font-bold text-brand",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 border-t border-border pt-4">
              <HeaderActions
                mobile
                isSignedIn={Boolean(profile)}
                isAdmin={profile?.role === "admin"}
              />
            </div>
          </div>
        </details>
      </SiteContainer>
    </CustomerHeaderFrame>
  );
}
