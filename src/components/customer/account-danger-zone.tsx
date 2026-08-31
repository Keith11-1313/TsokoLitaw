"use client";

import { RotateCcw, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  cancelAccountDeletionAction,
  requestAccountDeletionAction,
  type AccountDeletionState,
} from "@/app/profile/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/form-field";

const initialState: AccountDeletionState = { status: "idle", message: "" };

export function AccountDangerZone({
  deletionScheduledFor,
}: {
  deletionScheduledFor: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [requestState, requestAction, isRequestPending] = useActionState(
    requestAccountDeletionAction,
    initialState,
  );
  const [cancelState, cancelAction, isCancelPending] = useActionState(
    cancelAccountDeletionAction,
    initialState,
  );
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const formattedDeletionDate = deletionScheduledFor
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(new Date(deletionScheduledFor))
    : null;

  return (
    <>
      <section
        className="rounded-card border border-danger-foreground/25 bg-surface p-6"
        aria-labelledby="danger-zone-title"
      >
        <div>
          <h2 id="danger-zone-title" className="font-display text-xl text-danger-foreground">
            Danger zone
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {formattedDeletionDate
              ? `Deletion is scheduled for ${formattedDeletionDate}.`
              : "Schedule permanent account deletion with a 90-day grace period."}
          </p>
        </div>

        {formattedDeletionDate ? (
          <form action={cancelAction} className="mt-5">
            <SecondaryButton className="w-full" type="submit" disabled={isCancelPending}>
              <RotateCcw aria-hidden="true" size={17} />
              {isCancelPending ? "Cancelling…" : "Cancel deletion"}
            </SecondaryButton>
            {cancelState.message ? <ActionMessage state={cancelState} /> : null}
          </form>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-danger-foreground px-5 py-3 text-sm font-bold text-danger-foreground transition-colors hover:bg-danger-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <Trash2 aria-hidden="true" size={17} />
            Schedule account deletion
          </button>
        )}
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4"
          onPointerDown={() => setOpen(false)}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-deletion-title"
            aria-describedby="account-deletion-description"
            onPointerDown={(event) => event.stopPropagation()}
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="account-deletion-title" className="font-display text-2xl text-danger-foreground">
                  Schedule account deletion
                </h2>
                <p id="account-deletion-description" className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your TsokoLitaw account will be deleted after 90 days. You can cancel before then. Your Google account is not affected, and active orders or refunds must be resolved first.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close account deletion dialog"
                onClick={() => setOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <form action={requestAction} className="mt-6">
              <label className="block text-sm font-bold" htmlFor="delete-account-confirmation">
                Type <span className="text-danger-foreground">DELETE</span> to confirm
              </label>
              <input
                className={`${inputClassName} mt-3`}
                id="delete-account-confirmation"
                name="confirmation"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                pattern="DELETE"
                aria-invalid={confirmation.length > 0 && confirmation !== "DELETE" || undefined}
              />
              {confirmation.length > 0 && confirmation !== "DELETE" ? <p className="mt-2 text-xs font-bold text-danger-foreground">Type DELETE exactly as shown.</p> : null}
              {requestState.message ? <ActionMessage state={requestState} /> : null}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SecondaryButton className="w-full" type="button" onClick={() => setOpen(false)}>
                  Keep my account
                </SecondaryButton>
                <PrimaryButton
                  className="w-full bg-danger-foreground hover:bg-danger-foreground/90"
                  type="submit"
                  disabled={isRequestPending || confirmation !== "DELETE"}
                >
                  <Trash2 aria-hidden="true" size={17} />
                  {isRequestPending ? "Scheduling…" : "Schedule deletion"}
                </PrimaryButton>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ActionMessage({ state }: { state: AccountDeletionState }) {
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`mt-4 rounded-control p-3 text-sm ${
        state.status === "error"
          ? "bg-danger-background text-danger-foreground"
          : "bg-success-background text-success-foreground"
      }`}
    >
      {state.message}
    </p>
  );
}
