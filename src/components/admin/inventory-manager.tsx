"use client";

import { useActionState } from "react";
import { PackageCheck, ShoppingBasket, Trash2 } from "lucide-react";
import {
  consumeInventoryAction,
  saveInventoryAction,
  type InventoryActionState,
} from "@/app/admin/inventory/actions";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import type {
  AdminInventoryDate,
  AdminInventoryRecord,
} from "@/lib/server-inventory";

const initialState: InventoryActionState = { status: "idle", message: "" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function modeLabel(mode: AdminInventoryDate["availabilityMode"]) {
  return mode === "READY_STOCK" ? "Ready stock" : "Hybrid";
}

function ActionMessage({ state }: { state: InventoryActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-control p-3 text-sm font-bold ${
        state.status === "error"
          ? "bg-danger-background text-danger-foreground"
          : "bg-success-background text-success-foreground"
      }`}
    >
      {state.message}
    </p>
  );
}

function StockEditor({
  product,
  dates,
  record,
}: {
  product: { id: string; name: string };
  dates: AdminInventoryDate[];
  record?: AdminInventoryRecord;
}) {
  const [state, action, pending] = useActionState(saveInventoryAction, initialState);
  const minimum = record ? record.stockReserved + record.stockConsumed : 0;

  return (
    <form action={action} className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <input type="hidden" name="productId" value={product.id} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl">
            {record ? formatDate(record.pickupDate) : "Publish ready stock"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.name} · counted as individual pieces
          </p>
        </div>
        {record ? (
          <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${
            record.isAvailable
              ? "bg-success-background text-success-foreground"
              : "bg-surface-muted text-muted-foreground"
          }`}>
            {record.isAvailable ? "Accepting orders" : "Paused"}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold">
          <span>Pickup date</span>
          {record ? (
            <>
              <input type="hidden" name="pickupDate" value={record.pickupDate} />
              <span className="flex min-h-12 items-center rounded-control bg-surface-control px-4 font-normal">
                {formatDate(record.pickupDate)}
              </span>
            </>
          ) : (
            <select name="pickupDate" required defaultValue="" className="min-h-12 w-full rounded-control bg-surface-control px-4 font-normal">
              <option value="" disabled>Choose a published ready-stock date</option>
              {dates.map((date) => (
                <option key={date.id} value={date.pickupDate}>
                  {formatDate(date.pickupDate)} · {modeLabel(date.availabilityMode)}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="space-y-2 text-sm font-bold">
          <span>Total prepared pieces</span>
          <input
            name="stockTotal"
            type="number"
            min={minimum}
            max={100000}
            step={1}
            required
            defaultValue={record?.stockTotal ?? 0}
            className="min-h-12 w-full rounded-control bg-surface-control px-4 font-normal"
          />
          {minimum > 0 ? <span className="block text-xs font-normal text-muted-foreground">Cannot go below {minimum} committed or consumed pieces.</span> : null}
        </label>

        <label className="space-y-2 text-sm font-bold sm:col-span-2">
          <span>Adjustment note (optional)</span>
          <input name="notes" maxLength={240} placeholder="Example: Morning batch added" className="min-h-12 w-full rounded-control bg-surface-control px-4 font-normal" />
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-control bg-surface-control px-4 text-sm font-bold sm:col-span-2">
          <input name="isAvailable" type="checkbox" defaultChecked={record?.isAvailable ?? true} className="size-4 accent-brand" />
          Available for online checkout
        </label>
      </div>

      <div className="mt-5 space-y-3">
        <ActionMessage state={state} />
        <PrimaryButton type="submit" disabled={pending || (!record && dates.length === 0)}>
          {pending ? "Saving…" : record ? "Save stock settings" : "Publish stock"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function ConsumptionForm({ record }: { record: AdminInventoryRecord }) {
  const [state, action, pending] = useActionState(consumeInventoryAction, initialState);
  return (
    <form action={action} className="mt-5 border-t border-border pt-5">
      <input type="hidden" name="inventoryId" value={record.id} />
      <h3 className="font-display text-xl">Record pieces leaving school stock</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Use this for products sold in person or pieces that can no longer be sold. Online orders are committed automatically.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <label className="space-y-2 text-sm font-bold">
          <span>Reason</span>
          <select name="reason" className="min-h-12 w-full rounded-control bg-surface-control px-3 font-normal">
            <option value="WALK_IN_SALE">Walk-in sale</option>
            <option value="WASTE">Waste</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold">
          <span>Pieces</span>
          <input name="quantity" type="number" min={1} max={record.stockAvailable} step={1} required defaultValue={1} className="min-h-12 w-full rounded-control bg-surface-control px-3 font-normal" />
        </label>
        <label className="space-y-2 text-sm font-bold">
          <span>Note (optional)</span>
          <input name="notes" maxLength={240} placeholder="Short operational note" className="min-h-12 w-full rounded-control bg-surface-control px-3 font-normal" />
        </label>
      </div>
      <div className="mt-4 space-y-3">
        <ActionMessage state={state} />
        <SecondaryButton type="submit" disabled={pending || record.stockAvailable < 1}>
          {pending ? "Recording…" : "Record consumption"}
        </SecondaryButton>
      </div>
    </form>
  );
}

export function InventoryManager({
  product,
  dates,
  records,
}: {
  product: { id: string; name: string };
  dates: AdminInventoryDate[];
  records: AdminInventoryRecord[];
}) {
  const total = records.reduce((sum, record) => sum + record.stockTotal, 0);
  const reserved = records.reduce((sum, record) => sum + record.stockReserved, 0);
  const available = records.reduce((sum, record) => sum + record.stockAvailable, 0);
  const configuredDates = new Set(records.map((record) => record.pickupDate));
  const unconfiguredDates = dates.filter((date) => !configuredDates.has(date.pickupDate));

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Inventory summary">
        <AdminStatCard compact label="Prepared pieces" value={String(total)} />
        <AdminStatCard compact label="Online committed" value={String(reserved)} accentClassName="text-info-foreground" />
        <AdminStatCard compact label="Available pieces" value={String(available)} accentClassName="text-success-foreground" />
      </section>

      <section className="mt-7" aria-labelledby="inventory-rules-title">
        <div className="grid gap-4 rounded-card border border-border bg-surface-muted p-5 text-sm md:grid-cols-3">
          <div className="flex gap-3"><PackageCheck aria-hidden="true" className="shrink-0 text-brand" size={20} /><div><h2 id="inventory-rules-title" className="font-bold">One shared piece balance</h2><p className="mt-1 leading-6 text-muted-foreground">All 4-, 6-, and 8-piece boxes draw from the same prepared Palitaw pieces for that date.</p></div></div>
          <div className="flex gap-3"><ShoppingBasket aria-hidden="true" className="shrink-0 text-brand" size={20} /><div><h2 className="font-bold">Walk-in sales</h2><p className="mt-1 leading-6 text-muted-foreground">Record school sales immediately so checkout cannot sell those pieces online.</p></div></div>
          <div className="flex gap-3"><Trash2 aria-hidden="true" className="shrink-0 text-brand" size={20} /><div><h2 className="font-bold">Waste</h2><p className="mt-1 leading-6 text-muted-foreground">Damaged or unusable pieces reduce availability while preserving an audit trail.</p></div></div>
        </div>
      </section>

      {unconfiguredDates.length > 0 ? (
        <section className="mt-7" aria-labelledby="publish-stock-title">
          <h2 id="publish-stock-title" className="sr-only">Publish stock</h2>
          <StockEditor product={product} dates={unconfiguredDates} />
        </section>
      ) : dates.length === 0 ? (
        <p className="mt-7 rounded-card border border-warning-border bg-warning-background p-5 text-sm leading-6 text-warning-foreground">Create an upcoming Ready stock or Hybrid pickup date before publishing inventory.</p>
      ) : null}

      <section className="mt-7 space-y-5" aria-labelledby="daily-stock-title">
        <div><h2 id="daily-stock-title" className="font-display text-2xl">Daily piece stock</h2><p className="mt-1 text-sm text-muted-foreground">Exact totals and every consumption change are validated and audited on the server.</p></div>
        {records.length ? records.map((record) => (
          <article key={`${record.id}-${record.updatedAt}`}>
            <StockEditor product={product} dates={dates} record={record} />
            <div className="-mt-1 rounded-b-card border border-t-0 border-border bg-surface px-5 pb-6 sm:px-6">
              <dl className="grid gap-3 rounded-control bg-surface-muted p-4 text-sm sm:grid-cols-3">
                <div><dt className="text-muted-foreground">Online committed</dt><dd className="mt-1 font-bold">{record.stockReserved} pieces</dd></div>
                <div><dt className="text-muted-foreground">Walk-in / waste</dt><dd className="mt-1 font-bold">{record.stockConsumed} pieces</dd></div>
                <div><dt className="text-muted-foreground">Available now</dt><dd className="mt-1 font-bold">{record.stockAvailable} pieces</dd></div>
              </dl>
              <ConsumptionForm record={record} />
            </div>
          </article>
        )) : <p className="rounded-card border border-border bg-surface p-6 text-sm text-muted-foreground">No ready-stock inventory has been published yet.</p>}
      </section>
    </>
  );
}
