import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Megaphone, PlayCircle, Sparkles, Star, Video } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { DessertPlaceholder } from "@/components/home/dessert-placeholder";
import { SiteContainer } from "@/components/layout/site-container";
import { primaryButtonClassName } from "@/components/ui/button";
import { journalContentTypeLabels, type JournalIconKey } from "@/lib/journal";
import { getPublishedJournalPosts, type JournalPostSummary } from "@/lib/server-journal";
import { getPublicFeaturedReviews } from "@/lib/server-reviews";

export const metadata: Metadata = {
  title: "The TsokoLitaw Journal",
  description: "Announcements, kitchen stories, product features, and customer highlights from TsokoLitaw.",
  alternates: { canonical: "/journal" },
};

const iconMap = { megaphone: Megaphone, sparkles: Sparkles, file_text: FileText, video: Video } as const;

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function PostMedia({ post }: { post: JournalPostSummary }) {
  if (post.coverImageUrl) {
    return (
      <div
        role="img"
        aria-label={`Cover image for ${post.title}`}
        className="aspect-[16/9] rounded-control bg-surface-muted bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(post.coverImageUrl).slice(1, -1)})` }}
      />
    );
  }

  return <DessertPlaceholder variant={post.contentType === "product_feature" ? "hero" : "featured"} />;
}

function JournalPostCard({ post }: { post: JournalPostSummary }) {
  const Icon = iconMap[post.iconKey as JournalIconKey];
  return (
    <article className="rounded-card border border-border bg-surface p-5">
      <PostMedia post={post} />
      <div className="mt-5 flex items-start gap-3">
        <Icon className="shrink-0 text-brand" aria-hidden="true" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{journalContentTypeLabels[post.contentType]}</p>
          <h3 className="mt-1 font-display text-2xl">{post.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDisplayDate(post.displayDate)}</p>
          {post.excerpt ? <p className="mt-3 text-sm font-bold leading-6">{post.excerpt}</p> : null}
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{post.content}</p>
          {post.videoUrl ? <a href={post.videoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-brand underline underline-offset-4"><PlayCircle aria-hidden="true" size={18} />Watch video</a> : null}
        </div>
      </div>
    </article>
  );
}

function JournalEmptyState() {
  return (
    <section
      className="mt-10 overflow-hidden rounded-card border border-border bg-surface shadow-[0_24px_70px_-48px_rgba(54,30,10,0.55)]"
      aria-labelledby="journal-empty-heading"
    >
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="flex items-center gap-3 text-brand">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted">
              <Sparkles aria-hidden="true" size={19} />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em]">Our first entry is in the works</p>
          </div>
          <h2 id="journal-empty-heading" className="mt-6 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
            Fresh stories are coming soon.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            We’re preparing kitchen notes, product stories, announcements, and moments from the TsokoLitaw community. Check back soon for our first post.
          </p>
          <div className="mt-8">
            <Link href="/our-creations" className={primaryButtonClassName}>
              Explore our creations
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>

        <div className="relative min-h-72 overflow-hidden bg-brand px-6 py-10 text-surface sm:min-h-80 sm:px-10 lg:min-h-full lg:p-12" aria-hidden="true">
          <div className="absolute -right-20 -top-20 size-64 rounded-full border border-surface/10" />
          <div className="absolute -bottom-24 -left-20 size-72 rounded-full bg-surface/5" />
          <div className="relative mx-auto flex h-full max-w-md items-center justify-center">
            <div className="w-full rotate-[-2deg] rounded-card border border-surface/20 bg-[#fffaf3] p-6 text-foreground shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-script text-4xl leading-none text-brand">TsokoLitaw</span>
                <span className="rounded-full bg-surface-muted px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-brand">Journal</span>
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-3 w-4/5 rounded-full bg-brand/20" />
                <div className="h-3 w-full rounded-full bg-brand/10" />
                <div className="h-3 w-11/12 rounded-full bg-brand/10" />
              </div>
              <div className="mt-8 flex items-end justify-between">
                <div className="space-y-2">
                  <div className="h-2 w-20 rounded-full bg-brand/15" />
                  <div className="h-2 w-28 rounded-full bg-brand/10" />
                </div>
                <span className="flex size-12 items-center justify-center rounded-full bg-brand text-surface">
                  <FileText size={21} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function JournalPage() {
  const [posts, reviews] = await Promise.all([
    getPublishedJournalPosts(),
    getPublicFeaturedReviews(),
  ]);
  const latestAnnouncement = posts.find((post) => post.contentType === "announcement") ?? null;
  const remainingPosts = posts.filter((post) => post.id !== latestAnnouncement?.id);

  return (
    <CustomerPageShell activePath="/journal">
      <SiteContainer className="py-12 sm:py-16">
        <header className="w-full">
          <p className="font-script text-5xl text-brand">From our kitchen</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">The TsokoLitaw Journal</h1>
          <p className="mt-4 leading-7 text-muted-foreground">Announcements, kitchen stories, product features, and moments shared by our community.</p>
        </header>

        {posts.length === 0 ? <JournalEmptyState /> : null}

        {latestAnnouncement ? (
          <section className="mt-10 rounded-card border border-border bg-surface p-6 sm:p-8" aria-labelledby="announcement-heading">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand"><Megaphone aria-hidden="true" size={20} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Latest announcement · {formatDisplayDate(latestAnnouncement.displayDate)}</p>
                <h2 id="announcement-heading" className="mt-2 font-display text-2xl sm:text-3xl">{latestAnnouncement.title}</h2>
                {latestAnnouncement.excerpt ? <p className="mt-3 font-bold leading-7">{latestAnnouncement.excerpt}</p> : null}
                <p className="mt-2 max-w-4xl whitespace-pre-line text-sm leading-6 text-muted-foreground">{latestAnnouncement.content}</p>
              </div>
            </div>
          </section>
        ) : null}

        {posts.length ? (
          <section className="mt-14" aria-labelledby="stories-heading">
            <div className="flex items-center gap-3"><Sparkles className="text-brand" aria-hidden="true" size={22} /><h2 id="stories-heading" className="font-display text-3xl">Stories and features</h2></div>
            {remainingPosts.length ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">{remainingPosts.map((post) => <JournalPostCard key={post.id} post={post} />)}</div>
            ) : (
              <div className="mt-6 rounded-card border border-border bg-surface px-6 py-8 sm:px-8">
                <p className="font-display text-2xl">More from our kitchen soon.</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">The latest announcement is up now. Stories and product features will join it here as they are published.</p>
              </div>
            )}
          </section>
        ) : null}

        {reviews.length ? (
          <section className="mt-14" aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="font-display text-3xl">Community highlights</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {reviews.map((review) => (
                <blockquote key={review.id} className="rounded-card border border-border bg-surface p-6">
                  <div className="flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" className={index < review.rating ? "fill-warning-foreground text-warning-foreground" : "text-border"} size={17} />)}
                  </div>
                  <p className="mt-4 leading-7">“{review.comment}”</p>
                  <footer className="mt-4 text-sm font-bold text-muted-foreground">{review.customerName}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}
      </SiteContainer>
    </CustomerPageShell>
  );
}
