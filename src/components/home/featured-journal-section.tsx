import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { JournalPostCard } from "@/components/journal/journal-post-card";
import { SiteContainer } from "@/components/layout/site-container";
import { secondaryButtonClassName } from "@/components/ui/button";
import { getFeaturedJournalPosts } from "@/lib/server-journal";

export async function FeaturedJournalSection({ heading }: { heading: string }) {
  const posts = await getFeaturedJournalPosts();

  return (
    <section
      className="bg-surface py-14 sm:py-16 lg:py-[4.5rem]"
      aria-labelledby="featured-journal-heading"
    >
      <SiteContainer>
        <div className="mb-7">
          <h2
            className="font-display text-4xl leading-tight text-brand sm:text-5xl"
            id="featured-journal-heading"
          >
            {heading}
          </h2>
        </div>

        {posts.length ? (
          <div className="grid items-start gap-6">
            {posts.map((post) => (
              <JournalPostCard key={post.id} post={post} surface="background" />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-border bg-background p-8 text-center">
            <p className="font-display text-2xl">Fresh stories are coming soon.</p>
          </div>
        )}

        <div className="mt-7 flex justify-center">
          <Link href="/journal" className={secondaryButtonClassName}>
            Read more stories
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </SiteContainer>
    </section>
  );
}

export function FeaturedJournalSectionFallback({ heading }: { heading: string }) {
  return (
    <section
      className="bg-surface py-14 sm:py-16 lg:py-[4.5rem]"
      aria-labelledby="featured-journal-loading-heading"
    >
      <SiteContainer>
        <h2
          id="featured-journal-loading-heading"
          className="font-display text-4xl leading-tight text-brand sm:text-5xl"
        >
          {heading}
        </h2>
        <div className="mt-7 grid items-start gap-6" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-card border border-border bg-background p-5 sm:p-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8"
            >
              <div className="aspect-video rounded-control bg-surface-muted lg:order-2" />
              <div className="mt-5 space-y-3 lg:order-1 lg:mt-0 lg:py-3">
                <div className="h-4 w-1/4 rounded-full bg-surface-muted" />
                <div className="h-8 w-3/4 rounded-full bg-surface-muted" />
                <div className="h-4 w-1/3 rounded-full bg-surface-muted" />
                <div className="h-4 w-full rounded-full bg-surface-muted" />
                <div className="h-4 w-4/5 rounded-full bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
