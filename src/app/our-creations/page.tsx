import type { Metadata } from "next";
import { ProductConfigurator } from "@/components/creations/product-configurator";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { getPublicCommerceCatalog } from "@/lib/server-commerce";

export const metadata: Metadata = {
  title: "Our Creations | TsokoLitaw",
  description: "Build a chocolate-filled TsokoLitaw box with your favorite coatings.",
};

export default async function OurCreationsPage() {
  const catalog = await getPublicCommerceCatalog();

  return (
    <CustomerPageShell activePath="/our-creations"><SiteContainer className="py-12 sm:py-16 lg:py-20"><ProductConfigurator catalog={catalog} /></SiteContainer></CustomerPageShell>
  );
}
