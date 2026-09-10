import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { secondaryButtonClassName } from "@/components/ui/button";
import { journalContentTypeLabels } from "@/lib/journal";
import { getPublishedJournalPostBySlug } from "@/lib/server-journal";

interface JournalPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: JournalPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedJournalPostBySlug(slug);

  return post
    ? {
        title: `${post.title} | TsokoLitaw Journal`,
        description: post.excerpt || post.content.slice(0, 160),
        alternates: { canonical: `/journal/${post.slug}` },
      }
    : { title: "Journal Post | TsokoLitaw" };
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export default async function JournalPostPage({ params }: JournalPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedJournalPostBySlug(slug);
  if (!post) notFound();

  return (
    <CustomerPageShell activePath="/journal">
      <SiteContainer className="py-8 sm:py-12">
        <Link
          href="/journal"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back to Journal
        </Link>

        <article className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-card border border-border bg-surface">
          {post.coverImageUrl ? (
            <div
              role="img"
              aria-label={`Cover image for ${post.title}`}
              className="aspect-video bg-surface-muted bg-cover bg-center"
              style={{
                backgroundImage: `url(${JSON.stringify(post.coverImageUrl).slice(1, -1)})`,
              }}
            />
          ) : null}
          <div className="p-6 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
              {journalContentTypeLabels[post.contentType]} · {formatDisplayDate(post.displayDate)}
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{post.title}</h1>
            {post.excerpt ? (
              <p className="mt-5 text-lg font-bold leading-8">{post.excerpt}</p>
            ) : null}
            <div className="mt-7 whitespace-pre-line text-base leading-8 text-muted-foreground">
              {post.content}
            </div>
            {post.videoUrl ? (
              <a
                href={post.videoUrl}
                target="_blank"
                rel="noreferrer"
                className={`${secondaryButtonClassName} mt-8`}
              >
                <PlayCircle aria-hidden="true" size={18} />
                Watch video
              </a>
            ) : null}
          </div>
        </article>
      </SiteContainer>
    </CustomerPageShell>
  );
}
