import { CustomerFooter } from "@/components/customer/customer-footer";
import { CustomerHeader } from "@/components/customer/customer-header";
import { FeaturedVideoSection } from "@/components/home/featured-video-section";
import { HomeHero } from "@/components/home/home-hero";

const homeContent = {
  hero: {
    scriptTitle: "TsokoLitaw",
    heading: "Filipino Artisanal Chocolate Mochi",
    tagline: "Sweet treat. Happy beat.",
    description:
      "Experience the softest, chewiest traditional rice cakes, filled with hot oozing local Tsokolate, rolled in grated coconut and toasted sesame seeds. Handmade daily.",
  },
  featuredVideo: {
    heading: "Featured Video",
    supportingText: "We make and we serve",
  },
} as const;

export default function Home() {
  return (
    <>
      <CustomerHeader activePath="/" />
      <main>
        <HomeHero {...homeContent.hero} />
        <FeaturedVideoSection {...homeContent.featuredVideo} />
      </main>
      <CustomerFooter
        address="University of Caloocan City, Caloocan, Metro Manila, Philippines"
        supportEmail="hello@tsokolitaw.ph"
      />
    </>
  );
}
