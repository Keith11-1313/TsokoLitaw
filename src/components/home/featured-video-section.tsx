import Link from "next/link";
import { FeaturedMediaCarousel } from "@/components/home/featured-media-carousel";
import { SiteContainer } from "@/components/layout/site-container";
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
        <FeaturedMediaCarousel />
        <div className="mt-7 flex justify-center">
          <Link href="/journal" className={secondaryButtonClassName}>Visit our Journal</Link>
        </div>
      </SiteContainer>
    </section>
  );
}
