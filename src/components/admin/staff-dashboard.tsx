import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { requireStaff } from "@/lib/auth";
import { getAdminOrders } from "@/lib/server-orders";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function StaffDashboard() {
  const actor = await requireStaff("/admin");
  const [orders, overview] = await Promise.all([
    getAdminOrders({ expirePayments: false }),
    createAdminSupabaseClient().rpc("get_staff_pickup_overview", { actor_id: actor.id }),
  ]);
  if (overview.error) throw new Error("Staff pickup overview could not be loaded.");
  const counts = [
    ["Awaiting preparation", orders.filter((o) => o.status === "CONFIRMED").length],
    ["Manual GCash reviews", orders.filter((o) => o.paymentStatus === "UNDER_REVIEW").length],
    [
      "Unpaid counter orders",
      orders.filter(
        (o) =>
          o.paymentMethod === "pay_at_counter" &&
          o.paymentStatus === "PENDING" &&
          !["CANCELLED", "EXPIRED", "COMPLETED"].includes(o.status),
      ).length,
    ],
    ["Ready for pickup", orders.filter((o) => o.status === "READY_FOR_PICKUP").length],
  ] as const;
  return (
    <AdminPageLayout activePath="/admin" title="Staff dashboard">
      <p className="mb-5 text-sm text-muted-foreground">
        Operational counts cover the loaded recent-order/review queue, not all historical orders. No
        business-wide sales reports are shown.
      </p>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {counts.map(([label, value]) => (
          <AdminStatCard key={label} compact label={label} value={String(value)} />
        ))}
      </div>
      <Link
        className="my-6 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-surface"
        href="/admin/orders"
      >
        Open order workspace
      </Link>
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-2xl">Published pickup and prepared stock</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Next 14 published dates. Management changes belong to Admin.
        </p>
        {overview.data?.map((date) => (
          <article key={date.pickup_date} className="border-b border-border py-4 last:border-0">
            <h3 className="font-bold">
              {date.pickup_date} · {date.availability_mode.replaceAll("_", " ")}
            </h3>
            <p className="text-sm">
              Prepared {date.prepared} · Reserved {date.reserved} · Sold/removed {date.sold}
            </p>
            <p className="text-sm">
              {Array.isArray(date.windows)
                ? date.windows
                    .map((window) => {
                      if (!window || typeof window !== "object" || Array.isArray(window)) return "";
                      return `${window.start}–${window.end} · ${window.locations ?? "No active location"}`;
                    })
                    .join("; ")
                : ""}
            </p>
          </article>
        ))}
        {!overview.data?.length ? <p className="mt-4">No published pickup dates.</p> : null}
      </section>
    </AdminPageLayout>
  );
}
