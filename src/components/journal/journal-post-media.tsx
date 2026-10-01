import { DessertPlaceholder } from "@/components/home/dessert-placeholder";
import { cn } from "@/lib/cn";
import type { JournalCoverFormat } from "@/lib/journal";
import type { JournalPostSummary } from "@/lib/server-journal";

const formatClasses: Record<JournalCoverFormat, string> = {
  landscape: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
};

export function JournalPostMedia({
  post,
  presentation = "card",
}: {
  post: JournalPostSummary;
  presentation?: "card" | "detail";
}) {
  const frameClassName = cn(
    formatClasses[post.coverFormat],
    "overflow-hidden rounded-control bg-surface-muted",
    post.coverFormat === "portrait" && presentation === "detail" && "mx-auto w-full max-w-lg",
  );

  if (post.coverImageUrl) {
    return (
      <div
        role="img"
        aria-label={`Cover image for ${post.title}`}
        className={cn(frameClassName, "bg-contain bg-center bg-no-repeat")}
        style={{ backgroundImage: `url(${JSON.stringify(post.coverImageUrl).slice(1, -1)})` }}
      />
    );
  }

  return (
    <div className={frameClassName}>
      <DessertPlaceholder variant={post.contentType === "product_feature" ? "hero" : "featured"} />
    </div>
  );
}
