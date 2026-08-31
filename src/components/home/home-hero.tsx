import Image from "next/image";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { primaryButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface HomeHeroProps {
  heading: string;
  tagline: string;
  description: string;
}

export function HomeHero({
  heading,
  tagline,
  description,
}: HomeHeroProps) {
  return (
    <section
      className="flex min-h-[calc(100vh-5.5rem)] items-center bg-background py-10 sm:min-h-[calc(100svh-5.5rem)] sm:py-14 lg:py-16"
      aria-labelledby="home-heading"
    >
      <SiteContainer className="w-full">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="max-w-2xl lg:translate-y-1">
            <h1
              className="max-w-2xl whitespace-pre-line font-display text-[2.5rem] leading-[1.08] text-foreground sm:text-5xl lg:text-[3rem]"
              id="home-heading"
            >
              {heading}
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {tagline}
            </p>
            <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
            <div className="mt-8">
              <Link
                className={cn(primaryButtonClassName, "w-full min-[420px]:w-auto")}
                href="/our-creations"
              >
                Order now
              </Link>
            </div>
          </div>

          <div className="relative aspect-[6/5] w-full overflow-hidden rounded-card bg-surface-muted lg:mr-8 lg:max-w-[32.5rem] lg:justify-self-end">
            <Image
              src="/images/home/hero-image.png"
              alt="TsokoLitaw Mode switched on beside a chocolate-filled Palitaw dessert"
              fill
              preload
              fetchPriority="high"
              sizes="(min-width: 1024px) 32.5rem, calc(100vw - 2rem)"
              className="object-cover"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
