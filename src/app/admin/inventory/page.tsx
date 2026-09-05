import type { Metadata } from "next";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { getAdminInventory } from "@/lib/server-inventory";

export const metadata: Metadata = { title: "Inventory | TsokoLitaw Admin" };

export default async function AdminInventoryPage() {
  await requireAdmin("/admin/inventory");
  const inventory = await getAdminInventory();

  return (
    <AdminShell activePath="/admin/inventory">
      <AdminContent>
        <header>
          <h1 className="font-display text-[2rem] leading-tight text-foreground sm:text-[2.25rem]">Inventory</h1>
        </header>
        <div className="mt-7"><InventoryManager {...inventory} /></div>
      </AdminContent>
    </AdminShell>
  );
}
