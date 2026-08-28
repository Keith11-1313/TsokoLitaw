"use client";

import { useActionState, useState } from "react";
import { CalendarDays, PackageCheck } from "lucide-react";
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
            {record ? "Stock settings" : "Publish stock for another date"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {record
              ? `Change the prepared-piece total for ${product.name}.`
              : "Choose an eligible pickup date and enter the pieces prepared for it."}
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
  const [selectedInventoryId, setSelectedInventoryId] = useState(records[0]?.id ?? "");
  const selectedRecord = records.find((record) => record.id === selectedInventoryId) ?? records[0];
  const selectedDate = selectedRecord
    ? dates.find((date) => date.pickupDate === selectedRecord.pickupDate)
    : undefined;
  const configuredDates = new Set(records.map((record) => record.pickupDate));
  const unconfiguredDates = dates.filter((date) => !configuredDates.has(date.pickupDate));

  return (
    <>
      <section className="rounded-card border border-border bg-surface-muted p-5" aria-labelledby="inventory-period-title">
        <div className="flex gap-3">
          <CalendarDays aria-hidden="true" className="mt-0.5 shrink-0 text-brand" size={22} />
          <div>
            <h2 id="inventory-period-title" className="font-bold">Inventory is separate for every pickup date</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              The numbers below apply only to the selected date. They reset when you publish stock for a different date; this page does not combine stock from multiple days.
            </p>
          </div>
        </div>
      </section>

      {selectedRecord ? (
        <section className="mt-7 space-y-5" aria-labelledby="selected-stock-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Viewing stock for</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 id="selected-stock-title" className="font-display text-3xl">{formatDate(selectedRecord.pickupDate)}</h2>
                {selectedDate ? (
                  <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-bold text-brand">
                    {modeLabel(selectedDate.availabilityMode)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{product.name} · stock counted in individual pieces</p>
            </div>
            {records.length > 1 ? (
              <label className="space-y-2 text-sm font-bold lg:min-w-72">
                <span>Change pickup date</span>
                <select
                  value={selectedRecord.id}
                  onChange={(event) => setSelectedInventoryId(event.target.value)}
                  className="min-h-12 w-full rounded-control bg-surface-control px-4 font-normal"
                >
                  {records.map((record) => (
                    <option key={record.id} value={record.id}>{formatDate(record.pickupDate)}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={`Inventory summary for ${formatDate(selectedRecord.pickupDate)}`}>
            <AdminStatCard compact label="Prepared" value={String(selectedRecord.stockTotal)} supportingText="Pieces entered by Admin" />
            <AdminStatCard compact label="Online committed" value={String(selectedRecord.stockReserved)} supportingText="Held for online orders" accentClassName="text-info-foreground" />
            <AdminStatCard compact label="Walk-in / waste" value={String(selectedRecord.stockConsumed)} supportingText="Recorded outside online orders" />
            <AdminStatCard compact label="Available now" value={String(selectedRecord.stockAvailable)} supportingText="Still available to sell" accentClassName="text-success-foreground" />
          </div>

          <div className="flex flex-col gap-2 rounded-control border border-border bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold">How the available stock is calculated</span>
            <span className="text-muted-foreground">
              {selectedRecord.stockTotal} prepared − {selectedRecord.stockReserved} online − {selectedRecord.stockConsumed} walk-in/waste = <strong className="text-success-foreground">{selectedRecord.stockAvailable} available</strong>
            </span>
          </div>

          <article key={`${selectedRecord.id}-${selectedRecord.updatedAt}`}>
            <StockEditor product={product} dates={dates} record={selectedRecord} />
            <div className="-mt-1 rounded-b-card border border-t-0 border-border bg-surface px-5 pb-6 sm:px-6">
              <ConsumptionForm record={selectedRecord} />
            </div>
          </article>
        </section>
      ) : (
        <section className="mt-7 rounded-card border border-border bg-surface p-6" aria-labelledby="empty-inventory-title">
          <div className="flex gap-3">
            <PackageCheck aria-hidden="true" className="shrink-0 text-brand" size={22} />
            <div>
              <h2 id="empty-inventory-title" className="font-display text-2xl">No stock published yet</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Publish the number of prepared pieces for an upcoming Ready stock or Hybrid pickup date.
              </p>
            </div>
          </div>
        </section>
      )}

      {unconfiguredDates.length > 0 ? (
        <section className="mt-7" aria-labelledby="publish-stock-title">
          <h2 id="publish-stock-title" className="sr-only">Publish stock for another date</h2>
          <StockEditor product={product} dates={unconfiguredDates} />
        </section>
      ) : dates.length === 0 ? (
        <p className="mt-7 rounded-card border border-warning-border bg-warning-background p-5 text-sm leading-6 text-warning-foreground">
          No eligible pickup date exists. Create an upcoming Ready stock or Hybrid date in Pickup before publishing prepared pieces.
        </p>
      ) : null}

      <section className="mt-7 rounded-card border border-border bg-surface-muted p-5 text-sm" aria-labelledby="shared-balance-title">
        <div className="flex gap-3">
          <PackageCheck aria-hidden="true" className="shrink-0 text-brand" size={20} />
          <div>
            <h2 id="shared-balance-title" className="font-bold">One piece balance per date</h2>
            <p className="mt-1 leading-6 text-muted-foreground">
              Box sizes do not have separate stock. A box of 4 uses 4 pieces, a box of 6 uses 6, and a box of 8 uses 8 from the selected date&apos;s available balance. Record walk-in sales and waste as soon as they happen.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
