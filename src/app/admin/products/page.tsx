import type { Metadata } from "next";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { getAdminCatalog } from "@/lib/server-catalog";

export const metadata: Metadata = { title: "Catalog | TsokoLitaw Admin" };

export default async function AdminProductsPage() {
  await requireAdmin("/admin/products");
  const catalog = await getAdminCatalog();
  return (
    <AdminShell activePath="/admin/products">
      <AdminContent>
        <header>
          <h1 className="font-display text-[2rem] leading-tight text-foreground sm:text-[2.25rem]">Catalog</h1>
        </header>
        <div className="mt-7"><CatalogManager {...catalog} /></div>
      </AdminContent>
    </AdminShell>
  );
}
