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
          <h1 className="font-display text-[2.25rem] leading-tight text-foreground">Inventory</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Publish prepared Palitaw pieces for ready-stock dates, track online commitments, and record school sales or waste.
          </p>
        </header>
        <div className="mt-8"><InventoryManager {...inventory} /></div>
      </AdminContent>
    </AdminShell>
  );
}
