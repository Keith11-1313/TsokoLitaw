import type { Metadata } from "next";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { requireAdmin } from "@/lib/auth";
import { getAdminCatalog } from "@/lib/server-catalog";

export const metadata: Metadata = { title: "Catalog | TsokoLitaw Admin" };

export default async function AdminProductsPage() {
  await requireAdmin("/admin/products");
  const catalog = await getAdminCatalog();
  return (
    <AdminPageLayout
      activePath="/admin/products"
      title="Catalog"
      description="Boxes, coatings, add-ons, images, and PHP prices used by Our Creations."
      purpose="Define everything a customer can configure and its displayed price."
      customerImpact="Changes feed Our Creations and server-authoritative checkout pricing. Existing orders keep their historical snapshots."
      connected
    >
      <CatalogManager {...catalog} />
    </AdminPageLayout>
  );
}
