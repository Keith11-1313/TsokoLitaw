import { DessertPlaceholder } from "@/components/home/dessert-placeholder";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";
import { secondaryButtonClassName } from "@/components/ui/button";

interface FeaturedVideoSectionProps {
  heading: string;
  supportingText: string;
}

export function FeaturedVideoSection({
  heading,
  supportingText,
}: FeaturedVideoSectionProps) {
  return (
    <section className="bg-surface py-14 sm:py-16 lg:py-[4.5rem]" aria-labelledby="featured-video-heading">
      <SiteContainer>
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2
            className="font-script text-5xl leading-none text-brand sm:text-[3.5rem]"
            id="featured-video-heading"
          >
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground">{supportingText}</p>
        </div>
        <figure>
          <DessertPlaceholder variant="featured" />
          <figcaption className="sr-only">
            A future video showing how TsokoLitaw is made and served.
          </figcaption>
        </figure>
        <Link href="/journal" className={`${secondaryButtonClassName} mt-6`}>Visit our Journal</Link>
      </SiteContainer>
    </section>
  );
}
