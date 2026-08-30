import { CustomerFooter } from "@/components/customer/customer-footer";
import { CustomerHeader } from "@/components/customer/customer-header";
import { FeaturedVideoSection } from "@/components/home/featured-video-section";
import { HomeHero } from "@/components/home/home-hero";

const homeContent = {
  hero: {
    heading: "The Filipino Chocolate\nXiao Long Bao",
    tagline: "A Filipino favorite, with a chocolate surprise.",
    description:
      "Soft and chewy palitaw filled with warm, melted chocolate and topped with your choice of coating. Served fresh with our signature sea salt cream sauce for a delicious sweet-and-salty bite.",
  },
  featuredVideo: {
    heading: "Featured at TsokoLitaw",
    supportingText: "Watch the process and explore our selection",
  },
} as const;

export default function Home() {
  return (
    <>
      <CustomerHeader activePath="/" />
      <main id="main-content" tabIndex={-1}>
        <HomeHero {...homeContent.hero} />
        <FeaturedVideoSection {...homeContent.featuredVideo} />
      </main>
      <CustomerFooter
        address="University of Caloocan City - Congressional Campus"
        supportEmail="tsokolitaw@gmail.com"
      />
    </>
  );
}
