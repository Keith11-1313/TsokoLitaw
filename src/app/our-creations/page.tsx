import type { Metadata } from "next";
import { ProductConfigurator } from "@/components/creations/product-configurator";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "Our Creations | TsokoLitaw",
  description: "Build a chocolate-filled TsokoLitaw box with your favorite coatings.",
};

export default function OurCreationsPage() {
  return (
    <CustomerPageShell activePath="/our-creations"><SiteContainer className="py-12 sm:py-16 lg:py-20"><div className="mb-10 w-full"><p className="font-script text-5xl leading-none text-brand">Our creations</p><h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Chocolate at the center. Your coating on the outside.</h1><p className="mt-4 leading-7 text-muted-foreground">Choose a box size, keep it classic, or mix coatings piece by piece.</p></div><ProductConfigurator /></SiteContainer></CustomerPageShell>
  );
}
