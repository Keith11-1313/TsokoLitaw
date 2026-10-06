"use client";

import { useId, useState, useTransition } from "react";
import { cancelAdminOrderAction } from "@/app/admin/orders/actions";
import { DiscardChangesDialog } from "@/components/admin/discard-changes-dialog";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useEditorDialog } from "@/hooks/use-editor-dialog";
import { useFormGate } from "@/hooks/use-form-gate";
import { canAdminCancelOrder } from "@/lib/order-status";
import type { AdminOrderSummary } from "@/lib/server-orders";

export function OrderCancellation({ order }: { order: AdminOrderSummary }) {
  const [open, setOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  if (cancelled)
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Order cancelled
      </p>
    );
  if (!canAdminCancelOrder(order)) return null;
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-control px-3 py-2 text-xs font-bold text-danger-foreground transition-colors hover:bg-danger-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        onClick={() => setOpen(true)}
      >
        Cancel order
      </button>
      {open && (
        <CancellationDialog
          order={order}
          onClose={() => setOpen(false)}
          onCancelled={() => {
            setOpen(false);
            setCancelled(true);
          }}
        />
      )}
    </>
  );
}

function CancellationDialog({
  order,
  onClose,
  onCancelled,
}: {
  order: AdminOrderSummary;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { formRef, formProps, canSubmit, isDirty } = useFormGate({
    requireDirty: true,
    extraValid: reason.trim().length >= 3,
  });
  const { dialogRef, discardDialogRef, requestClose, confirmDiscard, keepEditing, discardChanges } =
    useEditorDialog({ isDirty, pending, onClose });
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/50 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 id={`${id}-title`} className="font-display text-2xl font-bold">
          Cancel {order.orderNumber}?
        </h2>
        <p id={`${id}-description`} className="mt-3 text-sm leading-6 text-muted-foreground">
          This cancels an unpaid order and releases its reserved pieces and reward. The reason is
          saved in the Admin audit log. This cannot be undone.
        </p>
        <form
          ref={formRef}
          {...formProps}
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || pending) return;
            setError("");
            startTransition(async () => {
              try {
                const result = await cancelAdminOrderAction({
                  orderId: order.id,
                  expectedStatus: order.status,
                  reason,
                });
                if (result.status === "error") setError(result.message);
                else onCancelled();
              } catch {
                setError(
                  "Cancellation is unavailable. Refresh and check the order before trying again.",
                );
              }
            });
          }}
        >
          <label htmlFor={`${id}-reason`} className="text-sm font-bold">
            Cancellation reason <span className="text-danger-foreground">*</span>
          </label>
          <textarea
            id={`${id}-reason`}
            name="reason"
            required
            minLength={3}
            maxLength={500}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby={`${id}-hint`}
            className="mt-2 min-h-28 w-full rounded-control border border-border bg-surface-muted p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
          <p id={`${id}-hint`} className="mt-2 text-xs text-muted-foreground">
            3–500 characters. For example: Customer did not collect their unpaid order.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger-foreground">
              {error}
            </p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SecondaryButton disabled={pending} onClick={requestClose}>
              Keep order
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={pending || !canSubmit}
              className="bg-danger-foreground hover:bg-danger-foreground/90"
            >
              {pending ? "Cancelling…" : "Confirm cancellation"}
            </PrimaryButton>
          </div>
        </form>
      </section>
      {confirmDiscard && (
        <DiscardChangesDialog
          dialogRef={discardDialogRef}
          onKeepEditing={keepEditing}
          onDiscard={discardChanges}
        />
      )}
    </div>
  );
}
