"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import {
  consumeInventoryAction,
  saveInventoryAction,
  type InventoryActionState,
} from "@/app/admin/inventory/actions";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { DiscardChangesDialog } from "@/components/admin/discard-changes-dialog";
import { PrimaryButton, SecondaryButton, secondaryButtonClassName } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormStatusHint } from "@/components/ui/form-status-hint";
import { NumberStepper } from "@/components/ui/quantity-input";
import { useFormGate } from "@/hooks/use-form-gate";
import { useEditorDialog } from "@/hooks/use-editor-dialog";
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
  onSaved,
  onDirtyChange,
  onPendingChange,
  onCancel,
}: {
  product: { id: string; name: string };
  dates: AdminInventoryDate[];
  record?: AdminInventoryRecord;
  onSaved?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState(saveInventoryAction, initialState);
  const minimum = record ? record.stockReserved + record.stockConsumed : 0;
  const { formRef, formProps, canSubmit, statusMessage, isDirty } = useFormGate({ requireDirty: Boolean(record), extraValid: Boolean(record || dates.length) });
  useEffect(() => {
    if (state.status === "success") onSaved?.();
  }, [state.status, onSaved]);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
  useEffect(() => onPendingChange?.(pending), [onPendingChange, pending]);

  return (
    <form ref={formRef} {...formProps} action={action} className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <input type="hidden" name="productId" value={product.id} />
      <div>
        <div>
          <h2 className="font-display text-2xl">
            {record ? "Stock settings" : "Publish stock for another date"}
          </h2>
          {!record ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an eligible pickup date and enter the pieces prepared for it.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm font-bold">
          <span className="block">Pickup date</span>
          {record ? (
            <>
              <input type="hidden" name="pickupDate" value={record.pickupDate} />
              <span className="flex min-h-12 items-center rounded-control bg-surface-control px-4 font-normal">
                {formatDate(record.pickupDate)}
              </span>
            </>
          ) : (
            <CustomSelect label="Choose date" name="pickupDate" required placeholder="Choose a published ready-stock date" options={dates.map((date) => ({ value: date.pickupDate, label: `${formatDate(date.pickupDate)} · ${modeLabel(date.availabilityMode)}` }))} />
          )}
        </div>

        <div>
          <NumberStepper label="Total prepared pieces for this date" error={state.fieldErrors?.stockTotal} name="stockTotal" min={minimum} max={100000} step={1} required defaultValue={record?.stockTotal ?? 0} />
          {minimum > 0 ? (
            <span className="block text-xs font-normal text-muted-foreground">
              {minimum} pieces are already committed or removed. Use another pickup date to start a new independent stock limit.
            </span>
          ) : null}
        </div>

        <label className="space-y-2 text-sm font-bold sm:col-span-2">
          <span>Adjustment note (optional)</span>
          <input name="notes" maxLength={240} placeholder="Example: Morning batch added" className="min-h-12 w-full rounded-control bg-surface-control px-4 font-normal" />
        </label>

      </div>

      <div className="mt-5 space-y-3">
        <ActionMessage state={state} />
        <FormStatusHint message={statusMessage} />
        <div className={onCancel ? "grid gap-3 sm:grid-cols-2" : undefined}>
          {onCancel ? <SecondaryButton disabled={pending} onClick={onCancel}>Cancel</SecondaryButton> : null}
          <PrimaryButton type="submit" disabled={pending || !canSubmit}>
            {pending ? "Saving…" : record ? "Save stock settings" : "Publish stock"}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
}

function ConsumptionForm({ record }: { record: AdminInventoryRecord }) {
  const [state, action, pending] = useActionState(consumeInventoryAction, initialState);
  const { formRef, formProps, canSubmit, statusMessage } = useFormGate({ requireDirty: false, extraValid: record.stockAvailable > 0 });
  return (
    <form ref={formRef} {...formProps} action={action}>
      <input type="hidden" name="inventoryId" value={record.id} />
      <input type="hidden" name="reason" value="WASTE" />
      <h3 className="font-display text-xl">Record unusable pieces</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Use this only for damaged, spoiled, or otherwise unsellable pieces. All customer sales are paid through the website.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
        <NumberStepper label="Unusable pieces" error={state.fieldErrors?.quantity} name="quantity" min={1} max={record.stockAvailable} step={1} required defaultValue={1} />
        <label className="space-y-2 text-sm font-bold">
          <span>Note (optional)</span>
          <input name="notes" maxLength={240} placeholder="Short operational note" className="min-h-12 w-full rounded-control bg-surface-control px-3 font-normal" />
        </label>
      </div>
      <div className="mt-4 space-y-3">
        <ActionMessage state={state} />
        <FormStatusHint message={statusMessage} />
        <SecondaryButton type="submit" disabled={pending || !canSubmit}>
          {pending ? "Recording…" : "Record consumption"}
        </SecondaryButton>
      </div>
    </form>
  );
}

function PublishStockModal({
  product,
  dates,
  onClose,
}: {
  product: { id: string; name: string };
  dates: AdminInventoryDate[];
  onClose: () => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const { dialogRef, discardDialogRef, confirmDiscard, requestClose, keepEditing, discardChanges } = useEditorDialog({ isDirty, pending, onClose });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={requestClose}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="publish-stock-modal-title" aria-hidden={confirmDiscard || undefined} onPointerDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-3xl rounded-card bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Ready-stock inventory</p>
            <h2 id="publish-stock-modal-title" className="mt-1 font-display text-3xl">Publish stock for another date</h2>
          </div>
          <button type="button" aria-label="Close stock editor" disabled={pending} onClick={requestClose} className="flex size-11 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"><X aria-hidden="true" /></button>
        </div>
        <div className="p-5 pt-4 sm:p-7 sm:pt-4">
          <StockEditor product={product} dates={dates} onSaved={onClose} onDirtyChange={setIsDirty} onPendingChange={setPending} onCancel={requestClose} />
        </div>
      </section>
      {confirmDiscard ? <DiscardChangesDialog dialogRef={discardDialogRef} onKeepEditing={keepEditing} onDiscard={discardChanges} /> : null}
    </div>
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
  const [showPublishModal, setShowPublishModal] = useState(false);
  const selectedRecord = records.find((record) => record.id === selectedInventoryId) ?? records[0];
  const selectedDate = selectedRecord
    ? dates.find((date) => date.pickupDate === selectedRecord.pickupDate)
    : undefined;
  const configuredDates = new Set(records.map((record) => record.pickupDate));
  const unconfiguredDates = dates.filter((date) => !configuredDates.has(date.pickupDate));

  return (
    <>
      {selectedRecord ? (
        <section className="space-y-5" aria-labelledby="selected-stock-title">
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
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {records.length > 1 ? <CustomSelect className="lg:min-w-72" label="Change pickup date" value={selectedRecord.id} onChange={setSelectedInventoryId} options={records.map((item) => ({ value: item.id, label: formatDate(item.pickupDate) }))} /> : null}
              {unconfiguredDates.length > 0 ? <PrimaryButton onClick={() => setShowPublishModal(true)}><Plus size={17} />Publish stock for another date</PrimaryButton> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label={`Inventory summary for ${formatDate(selectedRecord.pickupDate)}`}>
            <AdminStatCard compact label="Prepared" value={String(selectedRecord.stockTotal)} />
            <AdminStatCard compact label="Online committed" value={String(selectedRecord.stockReserved)} accentClassName="text-info-foreground" />
            <AdminStatCard compact label="Unusable" value={String(selectedRecord.stockConsumed)} />
            <AdminStatCard compact label="Available now" value={String(selectedRecord.stockAvailable)} accentClassName="text-success-foreground" />
          </div>

          <article key={`${selectedRecord.id}-${selectedRecord.updatedAt}`} className="space-y-5">
            <StockEditor product={product} dates={dates} record={selectedRecord} />
            <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
              <ConsumptionForm record={selectedRecord} />
            </div>
          </article>
        </section>
      ) : (
        <section className="rounded-card border border-border bg-surface p-6 sm:p-8" aria-labelledby="empty-inventory-title">
          <h2 id="empty-inventory-title" className="font-display text-2xl">No stock published yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {unconfiguredDates.length > 0
              ? "Choose an upcoming Ready stock or Hybrid pickup date and publish the number of prepared pieces."
              : "Create an upcoming Ready stock or Hybrid date in Pickup before publishing prepared pieces."}
          </p>
          {unconfiguredDates.length > 0
            ? <PrimaryButton className="mt-5" onClick={() => setShowPublishModal(true)}><Plus size={17} />Publish stock</PrimaryButton>
            : <Link href="/admin/pickup" className={`${secondaryButtonClassName} mt-5`}>Go to Pickup</Link>}
        </section>
      )}

      {showPublishModal ? <PublishStockModal product={product} dates={unconfiguredDates} onClose={() => setShowPublishModal(false)} /> : null}

    </>
  );
}
