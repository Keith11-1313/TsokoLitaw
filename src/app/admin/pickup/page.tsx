import type { Metadata } from "next";
import { PickupManager } from "@/components/admin/pickup-manager";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { requireAdmin } from "@/lib/auth";
import { getAdminPickup } from "@/lib/server-pickup";

export const metadata: Metadata = { title: "Pickup Management | TsokoLitaw Admin" };

export default async function AdminPickupPage() {
  await requireAdmin("/admin/pickup");
  const pickup = await getAdminPickup();
  return (
    <AdminPageLayout
      activePath="/admin/pickup"
      title="Pickup"
    >
      <PickupManager {...pickup} />
    </AdminPageLayout>
  );
}
