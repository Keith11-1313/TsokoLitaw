import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface PaymentResultPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "success" | "danger";
  detailLabel: string;
  detailValue: string;
  primaryHref: string;
  primaryLabel: string;
}

export function PaymentResultPage({
  title,
  description,
  icon: Icon,
  tone,
  detailLabel,
  detailValue,
  primaryHref,
  primaryLabel,
}: PaymentResultPageProps) {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-24">
        <section className="mx-auto max-w-xl rounded-card border border-border bg-surface p-7 text-center sm:p-12">
          <span
            className={cn(
              "mx-auto flex size-16 items-center justify-center rounded-full",
              tone === "success"
                ? "bg-success-background text-success-foreground"
                : "bg-danger-background text-danger-foreground",
            )}
          >
            <Icon aria-hidden="true" size={32} strokeWidth={1.8} />
          </span>
          <h1 className="mt-6 font-display text-3xl text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <dl className="mt-8 rounded-control bg-surface-control px-5 py-4 text-left text-sm sm:flex sm:items-center sm:justify-between">
            <dt className="font-bold text-foreground">{detailLabel}</dt>
            <dd className="mt-1 text-muted-foreground sm:mt-0">{detailValue}</dd>
          </dl>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={primaryHref} className={primaryButtonClassName}>
              {primaryLabel}
            </Link>
            <Link href="/" className={secondaryButtonClassName}>
              Return Home
            </Link>
          </div>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
