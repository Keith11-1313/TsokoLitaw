import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { JournalPostMedia } from "@/components/journal/journal-post-media";
import { SiteContainer } from "@/components/layout/site-container";
import { secondaryButtonClassName } from "@/components/ui/button";
import { getJournalCardSummary, journalContentTypeLabels } from "@/lib/journal";
import { getFeaturedJournalPosts } from "@/lib/server-journal";

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

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
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Read our latest announcements, kitchen stories, and product features.
          </p>
        </div>

        {posts.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-card border border-border bg-background p-5"
              >
                <JournalPostMedia post={post} />
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                    {journalContentTypeLabels[post.contentType]}
                  </p>
                  <h3 className="mt-1 text-balance font-display text-2xl leading-tight">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDisplayDate(post.displayDate)}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {getJournalCardSummary(post.excerpt, post.content)}
                  </p>
                  <Link
                    href={`/journal/${post.slug}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-brand underline underline-offset-4"
                  >
                    Read post
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </div>
              </article>
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
        <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-card border border-border bg-background p-5"
            >
              <div className="aspect-video rounded-control bg-surface-muted" />
              <div className="mt-5 h-5 w-2/3 rounded-full bg-surface-muted" />
              <div className="mt-3 h-4 w-full rounded-full bg-surface-muted" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-surface-muted" />
            </div>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
