import { Menu } from "lucide-react";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { HeaderActions } from "@/components/customer/header-actions";
import { cn } from "@/lib/cn";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/our-creations", label: "Our Creations" },
  { href: "/journal", label: "Journal" },
] as const;

interface CustomerHeaderProps {
  activePath?: string;
}

export function CustomerHeader({ activePath }: CustomerHeaderProps) {
  return (
    <header className="relative z-40 border-b border-border bg-surface">
      <SiteContainer className="flex min-h-22 items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="TsokoLitaw home"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <BrandLockup subtitle="Timeless dessert" />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const isActive = activePath === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative rounded-sm py-2 text-sm text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  isActive && "font-bold text-brand after:absolute after:inset-x-1 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block"><HeaderActions /></div>

        <details className="group relative lg:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-surface-muted text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" size={21} />
            <span className="sr-only">Open navigation</span>
          </summary>
          <div className="absolute right-0 top-14 w-72 rounded-card border border-border bg-surface p-4 shadow-lg shadow-brand/5">
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
            <div className="mt-3 border-t border-border pt-4"><HeaderActions mobile /></div>
          </div>
        </details>
      </SiteContainer>
    </header>
  );
}
