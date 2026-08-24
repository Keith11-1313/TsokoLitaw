import type { Metadata } from "next";
import { Megaphone, PlayCircle, Sparkles, Star } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { DessertPlaceholder } from "@/components/home/dessert-placeholder";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "The TsokoLitaw Journal",
  description: "Announcements, kitchen stories, product features, and customer highlights from TsokoLitaw.",
};

const reviews = [
  { name: "Maria S.", rating: 5, text: "Soft, warm, and perfect for sharing after class." },
  { name: "Arnel P.", rating: 5, text: "The pickup was clear and the chocolate center was still gooey." },
] as const;

export default function JournalPage() {
  return (
    <CustomerPageShell activePath="/journal">
      <SiteContainer className="py-12 sm:py-16">
        <header className="max-w-2xl">
          <p className="font-script text-5xl text-brand">From our kitchen</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">The TsokoLitaw Journal</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Announcements, kitchen stories, product features, and moments shared by our community.
          </p>
        </header>

        <section className="mt-10 rounded-card border border-border bg-surface p-6 sm:p-8" aria-labelledby="announcement-heading">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand">
              <Megaphone aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Latest announcement</p>
              <h2 id="announcement-heading" className="mt-2 font-display text-2xl sm:text-3xl">Campus pickup schedule this week</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Mock announcement: pickup slots are available Monday through Saturday. Final schedules will be published here once operations are connected.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="stories-heading">
          <div className="flex items-center gap-3">
            <Sparkles className="text-brand" aria-hidden="true" size={22} />
            <h2 id="stories-heading" className="font-display text-3xl">Stories and features</h2>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-card border border-border bg-surface p-5">
              <DessertPlaceholder variant="featured" />
              <div className="mt-5 flex items-start gap-3">
                <PlayCircle className="shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Kitchen story</p>
                  <h3 className="mt-1 font-display text-2xl">A morning batch at UCC</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">A preview of how each chocolate-filled batch is prepared for campus pickup.</p>
                </div>
              </div>
            </article>
            <article className="rounded-card border border-border bg-surface p-5">
              <DessertPlaceholder variant="hero" />
              <div className="mt-5 flex items-start gap-3">
                <Sparkles className="shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Product feature</p>
                  <h3 className="mt-1 font-display text-2xl">Building a mixed box</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">See how cocoa, milk, palitaw, nuts, sesame, and cookies-and-cream coatings come together.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="font-display text-3xl">Community highlights</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {reviews.map((review) => (
              <blockquote key={review.name} className="rounded-card border border-border bg-surface p-6">
                <div className="flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: review.rating }, (_, index) => <Star key={index} className="fill-warning-foreground text-warning-foreground" size={17} />)}
                </div>
                <p className="mt-4 leading-7">“{review.text}”</p>
                <footer className="mt-4 text-sm font-bold text-muted-foreground">{review.name} · Verified completed order</footer>
              </blockquote>
            ))}
          </div>
        </section>
      </SiteContainer>
    </CustomerPageShell>
  );
}
