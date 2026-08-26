import type { Metadata } from "next";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";

export const metadata: Metadata = { title: "Catalog | TsokoLitaw Admin" };

export default function AdminProductsPage() {
  return (
    <AdminPageLayout
      activePath="/admin/products"
      title="Catalog"
      description="Boxes, coatings, add-ons, images, and PHP prices used by Our Creations."
      purpose="Define everything a customer can configure and its displayed price."
      customerImpact="Feeds the Our Creations builder and future server-side checkout pricing."
    >
      <CatalogManager />
    </AdminPageLayout>
  );
}
