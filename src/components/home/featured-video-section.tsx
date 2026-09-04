import Link from "next/link";
import { FeaturedMediaCarousel } from "@/components/home/featured-media-carousel";
import { SiteContainer } from "@/components/layout/site-container";
import { secondaryButtonClassName } from "@/components/ui/button";

interface FeaturedVideoSectionProps {
  heading: string;
}

export function FeaturedVideoSection({
  heading,
}: FeaturedVideoSectionProps) {
  return (
    <section className="bg-surface py-14 sm:py-16 lg:py-[4.5rem]" aria-labelledby="featured-video-heading">
      <SiteContainer>
        <div className="mb-7">
          <h2
            className="font-display text-4xl leading-tight text-brand sm:text-5xl"
            id="featured-video-heading"
          >
            {heading}
          </h2>
        </div>
        <FeaturedMediaCarousel />
        <div className="mt-7 flex justify-center">
          <Link href="/journal" className={secondaryButtonClassName}>Visit our Journal</Link>
        </div>
      </SiteContainer>
    </section>
  );
}
