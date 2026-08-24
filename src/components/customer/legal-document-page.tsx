import { CustomerPageHeading } from "@/components/customer/customer-page-heading";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

interface LegalDocumentPageProps {
  title: string;
  introduction: string;
  sections: readonly LegalSection[];
}

export function LegalDocumentPage({
  title,
  introduction,
  sections,
}: LegalDocumentPageProps) {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <CustomerPageHeading title={title} description={introduction} />
          <article className="mt-10 rounded-card border border-border bg-surface p-6 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle-foreground">
              Static preview · Last updated October 14, 2025
            </p>
            <div className="mt-8 space-y-8">
              {sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="font-display text-2xl text-foreground">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
