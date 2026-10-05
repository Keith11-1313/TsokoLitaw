import type { Metadata } from "next";
import { ProductConfigurator } from "@/components/creations/product-configurator";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { getPublicCommerceCatalog } from "@/lib/server-commerce";
import { getAuthProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Build Your TsokoLitaw Box | Our Creations",
  description: "Build a chocolate-filled TsokoLitaw box with your favorite coatings.",
  alternates: { canonical: "/our-creations" },
};

export default async function OurCreationsPage() {
  const [catalog, profile] = await Promise.all([getPublicCommerceCatalog(), getAuthProfile()]);

  return (
    <CustomerPageShell activePath="/our-creations">
      <SiteContainer className="py-8 sm:py-12 lg:py-16">
        <h1 className="sr-only">Build your TsokoLitaw box</h1>
        <ProductConfigurator catalog={catalog} canOrder={profile?.role !== "admin"} />
      </SiteContainer>
    </CustomerPageShell>
  );
}
