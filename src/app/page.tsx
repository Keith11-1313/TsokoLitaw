import type { Metadata } from "next";
import { CustomerFooter } from "@/components/customer/customer-footer";
import { CustomerHeader } from "@/components/customer/customer-header";
import { FeaturedVideoSection } from "@/components/home/featured-video-section";
import { HomeHero } from "@/components/home/home-hero";

export const metadata: Metadata = {
  title: "TsokoLitaw | The Filipino Chocolate Xiao Long Bao",
  description: "Order soft and chewy chocolate-filled palitaw online for scheduled pickup at UCC Congressional Campus.",
  alternates: { canonical: "/" },
};

const homeContent = {
  hero: {
    heading: "The Filipino Chocolate\nXiao Long Bao",
    tagline: "A Filipino favorite, with a chocolate surprise.",
    description:
      "Soft and chewy palitaw filled with warm, melted chocolate and topped with your choice of coating. Served fresh with our signature sea salt cream sauce for a delicious sweet-and-salty bite.",
  },
  featuredVideo: {
    heading: "Featured at TsokoLitaw",
  },
} as const;

export default function Home() {
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TsokoLitaw",
    url: "https://www.tsokolitaw.com",
    logo: "https://www.tsokolitaw.com/brand/logo.png",
    email: "tsokolitaw@gmail.com",
    address: {
      "@type": "PostalAddress",
      name: "University of Caloocan City - Congressional Campus",
      addressCountry: "PH",
    },
    sameAs: [
      "https://www.facebook.com/profile.php?id=61593123463925",
      "https://www.instagram.com/tsokolitaw/",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData).replace(/</g, "\\u003c"),
        }}
      />
      <CustomerHeader activePath="/" />
      <main id="main-content" className="customer-photo-background" tabIndex={-1}>
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
