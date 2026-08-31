"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { transitionOrderStatusAction } from "@/app/admin/orders/actions";
import type { OrderStatus } from "@/components/ui/status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { formatPhp } from "@/lib/commerce";
import {
  fulfillmentActionLabels,
  getNextFulfillmentStatus,
} from "@/lib/order-status";
import type { AdminOrderSummary } from "@/lib/server-orders";

const statusOptions: Array<{ value: "ALL" | OrderStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "CONFIRMED", label: "Received" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY_FOR_PICKUP", label: "Ready for pickup" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function FulfillmentAction({ order }: { order: AdminOrderSummary }) {
  const nextStatus = getNextFulfillmentStatus(order.status);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<null | { status: "success" | "error"; message: string }>(null);
  const [pending, startTransition] = useTransition();

  if (!nextStatus) return <span className="text-xs text-muted-foreground">No action</span>;

  const targetStatus = nextStatus;
  const actionLabel = fulfillmentActionLabels[targetStatus];

  function submit() {
    setResult(null);
    startTransition(async () => {
      const actionResult = await transitionOrderStatusAction({
        orderId: order.id,
        expectedStatus: order.status,
        nextStatus: targetStatus,
      });
      setResult(actionResult);
      if (actionResult.status === "success") setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-brand px-4 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {actionLabel}
        <ArrowRight aria-hidden="true" size={15} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4"
          onPointerDown={() => !pending && setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`transition-title-${order.id}`}
            onPointerDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fulfillment update</p>
                <h2 id={`transition-title-${order.id}`} className="mt-2 font-display text-2xl">
                  {actionLabel} for {order.orderNumber}?
                </h2>
              </div>
              <button
                type="button"
                disabled={pending}
                aria-label="Close fulfillment update"
                onClick={() => setOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              This changes the customer-visible order status from{" "}
              <strong className="text-foreground">{order.status.replaceAll("_", " ")}</strong> to{" "}
              <strong className="text-foreground">{targetStatus.replaceAll("_", " ")}</strong>.
              The action is recorded in the Admin audit log and cannot be reversed here.
            </p>

            {result?.status === "error" ? (
              <p role="alert" className="mt-4 rounded-control bg-danger-background p-4 text-sm text-danger-foreground">
                {result.message}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="min-h-12 rounded-full border border-brand px-5 font-bold text-brand disabled:opacity-60"
              >
                Keep current status
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="min-h-12 rounded-full bg-brand px-5 font-bold text-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Updating status…" : actionLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function OrderManagementTable({ orders }: { orders: AdminOrderSummary[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "ALL" && order.status !== status) return false;
      if (!normalizedQuery) return true;
      return [order.orderNumber, order.customerName, order.customerEmail, order.itemSummary]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [orders, query, status]);

  return (
    <section aria-label="Order management list">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="block space-y-2">
          <span className="block text-sm font-bold text-foreground">Search orders</span>
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order number, name, email, or item"
              className="min-h-12 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-focus focus:ring-2 focus:ring-focus/20"
            />
          </span>
        </label>
        <CustomSelect label="Status filter" value={status} onChange={(next) => setStatus(next as "ALL" | OrderStatus)} options={statusOptions} />
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-4 sm:p-6">
        {visibleOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
              <thead>
                <tr className="h-[3.75rem] bg-surface-muted text-xs text-foreground">
                  <th className="rounded-l-control px-4 font-bold">Order</th>
                  <th className="px-4 font-bold">Customer</th>
                  <th className="px-4 font-bold">Items</th>
                  <th className="px-4 font-bold">Total</th>
                  <th className="px-4 font-bold">Payment</th>
                  <th className="px-4 font-bold">Fulfillment</th>
                  <th className="px-4 font-bold">Pickup</th>
                  <th className="rounded-r-control px-4 text-center font-bold">Next action</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border align-top last:border-b-0">
                    <th className="px-4 py-5 font-bold text-foreground" scope="row">
                      {order.orderNumber}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">{formatDate(order.orderedAt)}</span>
                    </th>
                    <td className="px-4 py-5 text-foreground">
                      {order.customerName}
                      <span className="mt-1 block max-w-52 truncate text-xs text-muted-foreground">{order.customerEmail}</span>
                    </td>
                    <td className="max-w-72 px-4 py-5 text-muted-foreground">
                      <span className="line-clamp-2">{order.itemSummary || "No item snapshot"}</span>
                      <span className="mt-1 block text-xs">{order.boxQuantity} {order.boxQuantity === 1 ? "box" : "boxes"}</span>
                    </td>
                    <td className="px-4 py-5 font-bold text-foreground">{formatPhp(order.total)}</td>
                    <td className="px-4 py-5 text-xs font-bold text-foreground">{order.paymentStatus}</td>
                    <td className="px-4 py-5"><StatusBadge status={order.status} /></td>
                    <td className="max-w-56 px-4 py-5 text-xs leading-5 text-muted-foreground">
                      {order.pickupDate}<br />{order.pickupWindow}<br />{order.pickupLocation}
                    </td>
                    <td className="px-4 py-5 text-center"><FulfillmentAction order={order} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <h2 className="font-display text-2xl">No matching orders</h2>
            <p className="mt-2 text-sm text-muted-foreground">Change the search or status filter to see other orders.</p>
          </div>
        )}
        <p className="pt-5 text-xs text-muted-foreground">
          Showing {visibleOrders.length} of {orders.length} most recent orders
        </p>
      </div>
    </section>
  );
}
