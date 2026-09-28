import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { JournalPostMedia } from "@/components/journal/journal-post-media";
import { cn } from "@/lib/cn";
import {
  getJournalCardContentPreview,
  getJournalCardSummary,
  journalContentTypeLabels,
} from "@/lib/journal";
import type { JournalPostSummary } from "@/lib/server-journal";

function formatDisplayDate(value: string, dateStyle: "medium" | "long") {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle,
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export function JournalPostCard({
  post,
  surface = "surface",
  dateStyle = "medium",
}: {
  post: JournalPostSummary;
  surface?: "background" | "surface";
  dateStyle?: "medium" | "long";
}) {
  const isLandscape = post.coverFormat === "landscape";
  const previewLength = post.coverFormat === "portrait" ? 560 : 380;
  const contentPreview = getJournalCardContentPreview(post.excerpt, post.content, previewLength);
  const summary = getJournalCardSummary(
    post.excerpt,
    post.content,
    !post.excerpt ? previewLength : 180,
  );

  return (
    <article
      className={cn(
        "h-fit self-start rounded-card border border-border p-5 sm:p-6 lg:grid lg:items-stretch lg:gap-8",
        surface === "background" ? "bg-background" : "bg-surface",
        isLandscape
          ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
          : "lg:grid-cols-[minmax(16rem,0.65fr)_minmax(0,1.35fr)]",
      )}
    >
      <div className={cn(isLandscape && "lg:order-2")}>
        <JournalPostMedia post={post} />
      </div>
      <div className={cn("mt-5 flex min-w-0 flex-col lg:mt-0", isLandscape && "lg:order-1")}>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
          {journalContentTypeLabels[post.contentType]}
        </p>
        <h3 className="mt-1 text-balance font-display text-2xl leading-tight lg:text-3xl">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDisplayDate(post.displayDate, dateStyle)}
        </p>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{summary}</p>
        {contentPreview ? (
          <p className="mt-4 whitespace-pre-line text-base leading-7 text-foreground/85">
            {contentPreview}
          </p>
        ) : null}
        <div className="mt-5 border-t border-border pt-3 lg:mt-auto">
          <Link
            href={`/journal/${post.slug}`}
            className="inline-flex min-h-11 items-center gap-2 font-bold text-brand underline underline-offset-4"
          >
            Read post
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
