import {
  CalendarDays,
  ChefHat,
  Clock3,
  MapPin,
  PackageCheck,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { requireStaff } from "@/lib/auth";
import { getAdminOrders } from "@/lib/server-orders";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${date}T12:00:00+08:00`));
}

function formatTime(value: unknown) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}/.test(value)) return "";
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export async function StaffDashboard() {
  const actor = await requireStaff("/admin");
  const [orders, overview] = await Promise.all([
    getAdminOrders({ expirePayments: false }),
    createAdminSupabaseClient().rpc("get_staff_pickup_overview", { actor_id: actor.id }),
  ]);
  if (overview.error) throw new Error("Staff pickup overview could not be loaded.");
  const counts = [
    ["Awaiting preparation", orders.filter((o) => o.status === "CONFIRMED").length, ChefHat],
    [
      "Manual GCash reviews",
      orders.filter((o) => o.paymentStatus === "UNDER_REVIEW").length,
      ReceiptText,
    ],
    [
      "Unpaid counter orders",
      orders.filter(
        (o) =>
          o.paymentMethod === "pay_at_counter" &&
          o.paymentStatus === "PENDING" &&
          !["CANCELLED", "EXPIRED", "COMPLETED"].includes(o.status),
      ).length,
      Wallet,
    ],
    [
      "Ready for pickup",
      orders.filter((o) => o.status === "READY_FOR_PICKUP").length,
      PackageCheck,
    ],
  ] as const;
  return (
    <AdminPageLayout activePath="/admin" title="Staff dashboard">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {counts.map(([label, value, icon], index) => (
          <AdminStatCard
            key={label}
            compact
            icon={icon}
            label={label}
            value={String(value)}
            href={
              [
                "/admin/orders?status=CONFIRMED",
                "/admin/orders?payment=UNDER_REVIEW",
                "/admin/orders?payment=UNPAID_COUNTER",
                "/admin/orders?status=READY_FOR_PICKUP",
              ][index]
            }
          />
        ))}
      </div>
      <section className="mt-7" aria-labelledby="staff-pickup-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="staff-pickup-heading" className="font-display text-2xl">
            Upcoming pickups
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {overview.data?.map((date) => (
            <article
              key={date.pickup_date}
              className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6"
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-display text-xl">
                  <CalendarDays aria-hidden="true" size={20} className="shrink-0 text-brand" />
                  {formatDate(date.pickup_date)}
                </h3>
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold">
                  {
                    {
                      MADE_TO_ORDER: "Made to order",
                      READY_STOCK: "Ready stock",
                      HYBRID: "Hybrid",
                    }[date.availability_mode]
                  }
                </span>
              </header>
              <div className="my-5 space-y-3 text-sm text-muted-foreground">
                {Array.isArray(date.windows)
                  ? date.windows.map((window, index) => {
                      if (!window || typeof window !== "object" || Array.isArray(window))
                        return null;
                      return (
                        <div key={index} className="space-y-1.5">
                          <p className="flex items-center gap-2 font-bold text-foreground">
                            <Clock3 aria-hidden="true" size={16} className="shrink-0" />
                            {formatTime(window.start)} – {formatTime(window.end)}
                          </p>
                          <p className="flex items-start gap-2">
                            <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                            <span>
                              {typeof window.locations === "string" && window.locations
                                ? window.locations
                                : "No active location"}
                            </span>
                          </p>
                        </div>
                      );
                    })
                  : null}
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                {[
                  ["Available", Math.max(0, date.prepared - date.reserved - date.sold)],
                  ["Prepared", date.prepared],
                  ["Reserved", date.reserved],
                  ["Sold / removed", date.sold],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-display text-2xl">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        {!overview.data?.length ? (
          <div className="rounded-card border border-border bg-surface px-6 py-10 text-center">
            <CalendarDays aria-hidden="true" size={28} className="mx-auto mb-3 text-brand" />
            <p className="font-bold">No upcoming pickups</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Published pickup schedules will appear here.
            </p>
          </div>
        ) : null}
      </section>
      <div className="mt-7">
        <RecentOrdersTable
          orders={[...orders]
            .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
            .slice(0, 5)
            .map((order) => ({
              ...order,
              paymentMethod: order.paymentMethod ?? "paymongo",
              createdAt: order.orderedAt,
            }))}
        />
      </div>
    </AdminPageLayout>
  );
}
