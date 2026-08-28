"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, PackageOpen } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import { formatPhp } from "@/lib/commerce";
import type { CustomerOrderSummary } from "@/lib/server-orders";

type OrderFilter = "all" | "received" | "preparing" | "pickup" | "completed";

const FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "received", label: "Received" },
  { id: "preparing", label: "Preparing" },
  { id: "pickup", label: "Ready for pickup" },
  { id: "completed", label: "Completed" },
];

function matchesFilter(order: CustomerOrderSummary, filter: OrderFilter) {
  if (filter === "all") return true;
  if (filter === "received") return ["PAID", "CONFIRMED"].includes(order.status);
  if (filter === "preparing") return order.status === "PREPARING";
  if (filter === "pickup") return order.status === "READY_FOR_PICKUP";
  return order.status === "COMPLETED";
}

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(includeTime ? value : `${value}T00:00:00+08:00`));
}

export function OrdersList({ orders }: { orders: CustomerOrderSummary[] }) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const visibleOrders = useMemo(() => orders.filter((order) => matchesFilter(order, filter)), [filter, orders]);

  if (!orders.length) {
    return (
      <section className="py-14 text-center" aria-labelledby="order-history-status">
        <PackageOpen className="mx-auto text-brand" aria-hidden="true" size={36} />
        <h2 id="order-history-status" className="mt-5 font-display text-3xl text-foreground">No online orders yet</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Your TsokoLitaw orders will appear here after checkout.</p>
        <Link href="/our-creations" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-6 text-sm font-bold text-brand">Explore our creations</Link>
      </section>
    );
  }

  return (
    <section aria-label="Order history">
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filter orders">
        {FILTERS.map((item) => {
          const count = orders.filter((order) => matchesFilter(order, item.id)).length;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                filter === item.id ? "border-brand bg-brand text-surface" : "border-border bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {item.label} <span aria-label={`${count} orders`}>({count})</span>
            </button>
          );
        })}
      </div>

      {visibleOrders.length ? (
        <ul className="mt-6 space-y-4">
          {visibleOrders.map((order) => (
            <li key={order.id} className="rounded-card border border-border bg-surface p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl">{order.orderNumber}</h2>
                    <StatusBadge
                      status={order.status}
                      label={["PAID", "CONFIRMED"].includes(order.status) ? "Received" : undefined}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Ordered {formatDate(order.orderedAt, true)}</p>
                </div>
                <p className="font-display text-xl">{formatPhp(order.total)}</p>
              </div>
              <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-muted-foreground sm:grid-cols-2">
                <p className="flex items-start gap-2"><CalendarDays aria-hidden="true" className="mt-0.5 shrink-0" size={17} />{formatDate(order.pickupDate)} · {order.pickupWindow}</p>
                <p className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={17} />{order.pickupLocation}</p>
              </div>
              <p className="mt-4 text-sm leading-6">{order.itemSummary || "Order items unavailable"}</p>
              <div className="mt-5 flex justify-end"><Link href={`/orders/${order.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-5 text-sm font-bold text-brand">View order</Link></div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
          <PackageOpen className="mx-auto text-brand" aria-hidden="true" size={32} />
          <p className="mt-4 font-bold">No orders in this category</p>
        </div>
      )}
    </section>
  );
}
