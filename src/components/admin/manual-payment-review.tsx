"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleX, X } from "lucide-react";
import { loadManualPaymentAction, reviewManualPaymentAction } from "@/app/admin/orders/actions";
import { DiscardChangesDialog } from "@/components/admin/discard-changes-dialog";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { useEditorDialog } from "@/hooks/use-editor-dialog";
import { cn } from "@/lib/cn";
import { formatPhp } from "@/lib/commerce";
import { getPaymentStatusLabel } from "@/lib/payment-status";
import type { PaymentStatus } from "@/lib/payment-status";
import type { AdminManualPaymentDetails } from "@/lib/server-manual-payment";

const REJECTION_REASON_SUGGESTIONS = [
  "This payment reference was already used.",
  "The amount does not match the order total.",
  "The recipient does not match the expected GCash account.",
  "We could not find this payment in the receiving GCash account.",
  "The receipt belongs to a different transaction.",
  "The receipt details are unclear or incomplete.",
  "The payment date or time does not match this order.",
] as const;

interface ManualPaymentReviewProps {
  orderId: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  total: number;
  className?: string;
}

export function ManualPaymentReview({
  orderId,
  orderNumber,
  paymentStatus,
  total,
  className,
}: ManualPaymentReviewProps) {
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState<AdminManualPaymentDetails | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const label = paymentStatus === "UNDER_REVIEW" ? "Review payment" : "View payment";
  const proof = payment?.submissions[0];

  function notify(message: string, tone: "success" | "error") {
    setMessageTone(tone);
    setToast({ id: Date.now(), message, tone });
  }

  function load(announce = false) {
    setMessage("");
    startTransition(async () => {
      try {
        setPayment(await loadManualPaymentAction(orderId));
        if (announce) notify("Payment details refreshed.", "success");
      } catch {
        const nextMessage = "We couldn’t load the payment details. Please try again.";
        setMessage(nextMessage);
        notify(nextMessage, "error");
      }
    });
  }

  function openReview() {
    setPayment(null);
    setMessage("");
    setReason("");
    setVerified(false);
    setRejecting(false);
    setOpen(true);
    load();
  }

  function review(approve: boolean) {
    if (!proof || pending) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await reviewManualPaymentAction({
          submissionId: proof.id,
          approve,
          reason,
          verified,
        });
        setMessage(result.message);
        notify(result.message, result.status === "success" ? "success" : "error");
        if (result.status === "success") {
          setVerified(false);
          setReason("");
          setRejecting(false);
          setPayment(await loadManualPaymentAction(orderId));
        }
      } catch {
        const nextMessage =
          "We lost the connection. Refresh the payment details before trying again.";
        setMessage(nextMessage);
        notify(nextMessage, "error");
      }
    });
  }

  return (
    <>
      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <SecondaryButton
        aria-label={`${label} for ${orderNumber}`}
        className={cn("w-full px-4", className)}
        onClick={openReview}
      >
        {label}
      </SecondaryButton>
      {open
        ? createPortal(
            <ManualPaymentReviewDialog
              orderId={orderId}
              orderNumber={orderNumber}
              total={total}
              payment={payment}
              message={message}
              reason={reason}
              verified={verified}
              rejecting={rejecting}
              pending={pending}
              messageTone={messageTone}
              onReasonChange={setReason}
              onVerifiedChange={setVerified}
              onRejectingChange={setRejecting}
              onRefresh={() => load(true)}
              onReview={review}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function ManualPaymentReviewDialog({
  orderId,
  orderNumber,
  total,
  payment,
  message,
  reason,
  verified,
  rejecting,
  pending,
  messageTone,
  onReasonChange,
  onVerifiedChange,
  onRejectingChange,
  onRefresh,
  onReview,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  payment: AdminManualPaymentDetails | null;
  message: string;
  reason: string;
  verified: boolean;
  rejecting: boolean;
  pending: boolean;
  messageTone: "success" | "error";
  onReasonChange: (value: string) => void;
  onVerifiedChange: (value: boolean) => void;
  onRejectingChange: (value: boolean) => void;
  onRefresh: () => void;
  onReview: (approve: boolean) => void;
  onClose: () => void;
}) {
  const isDirty = verified || rejecting || reason.trim().length > 0;
  const { dialogRef, discardDialogRef, confirmDiscard, requestClose, keepEditing, discardChanges } =
    useEditorDialog({ isDirty, pending, onClose });

  const proof = payment?.submissions[0];
  const referenceConflict = payment?.approvedReferenceConflict ?? null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-foreground/50 p-3 sm:p-6"
      onPointerDown={requestClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`payment-review-title-${orderId}`}
        aria-describedby={`payment-review-description-${orderId}`}
        aria-hidden={confirmDiscard || undefined}
        onPointerDown={(event) => event.stopPropagation()}
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Manual GCash</p>
            <h2
              id={`payment-review-title-${orderId}`}
              className="mt-1 text-balance font-display text-2xl text-foreground sm:text-3xl"
            >
              Payment review for {orderNumber}
            </h2>
            <p
              id={`payment-review-description-${orderId}`}
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              Compare the customer’s receipt with the payment received in GCash before making a
              decision.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close payment review"
            disabled={pending}
            onClick={requestClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-brand transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <div className="mt-6 space-y-4 border-t border-border pt-6 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold text-foreground">Expected total: {formatPhp(total)}</h3>
            <SecondaryButton disabled={pending} onClick={onRefresh} className="w-full sm:w-auto">
              Refresh payment details
            </SecondaryButton>
          </div>

          {!payment && pending ? (
            <p role="status" className="rounded-control bg-surface-muted p-4 leading-6">
              Loading payment details…
            </p>
          ) : null}

          {payment ? (
            <>
              <p>Payment: {getPaymentStatusLabel(payment.status, "manual_gcash")}</p>
              <p>
                Expected recipient: <strong>{payment.recipientName}</strong>
              </p>
              {!proof ? (
                <p className="rounded-control bg-surface-muted p-4 leading-6">
                  No receipt has been submitted for this order.
                </p>
              ) : (
                <>
                  <dl className="grid gap-4 break-words rounded-control bg-surface-muted p-4 sm:grid-cols-2">
                    <div>
                      <dt className="font-bold">Submitted amount</dt>
                      <dd>
                        {formatPhp(proof.reported_amount)}
                        {proof.reported_amount !== total ? " (does not match)" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold">Reference</dt>
                      <dd className="[overflow-wrap:anywhere]">{proof.reported_reference}</dd>
                    </div>
                    <div>
                      <dt className="font-bold">Recipient</dt>
                      <dd>{proof.reported_recipient}</dd>
                    </div>
                    <div>
                      <dt className="font-bold">Payment time entered by customer</dt>
                      <dd>
                        {new Date(proof.reported_paid_at).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}{" "}
                        PHT
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold">Submitted</dt>
                      <dd>
                        {new Date(proof.submitted_at).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}{" "}
                        PHT
                      </dd>
                    </div>
                  </dl>
                  <figure className="overflow-hidden rounded-control border border-border">
                    {/* Private Admin-authorized route; do not send it through the public image optimizer. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/payment-receipts/${proof.id}`}
                      alt={`Submitted GCash receipt for ${orderNumber}`}
                      className="max-h-[32rem] w-full bg-surface-muted object-contain"
                    />
                    <figcaption className="flex flex-col gap-2 border-t border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-bold">Submitted receipt</span>
                      <a
                        className="inline-flex min-h-11 items-center rounded-sm font-bold text-brand underline decoration-border underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        href={`/api/payment-receipts/${proof.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open full size
                      </a>
                    </figcaption>
                  </figure>
                  {referenceConflict ? (
                    <div
                      role="alert"
                      className="rounded-control border border-danger bg-danger/5 p-4 leading-6 text-danger"
                    >
                      <p className="font-bold">This payment reference was already used</p>
                      <p>
                        It was approved for order {referenceConflict.orderNumber}. Do not approve
                        this receipt. Check the receiving GCash account, then reject it so the
                        customer can submit the correct receipt.
                      </p>
                    </div>
                  ) : null}
                  {proof.status === "UNDER_REVIEW" ? (
                    <>
                      <p className="leading-6">
                        Check the actual GCash transaction before deciding. Confirm the recipient,
                        amount, reference number and time. The receipt image alone does not prove
                        that the payment arrived.
                      </p>
                      <label className="flex min-h-11 items-start gap-3 leading-6">
                        <input
                          type="checkbox"
                          checked={verified}
                          disabled={pending}
                          onChange={(event) => onVerifiedChange(event.target.checked)}
                          className="mt-1 size-5 shrink-0 accent-brand"
                        />
                        I checked the receiving GCash account and compared the receipt details.
                      </label>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Approving confirms the order and queues its confirmation email. A rejection
                        gives the customer 15 minutes to send a corrected receipt. If they do not,
                        the unpaid order can expire.
                      </p>
                      {rejecting ? (
                        <div className="rounded-control border border-danger-foreground/30 bg-danger/5 p-4">
                          <label className="block font-bold text-danger-foreground">
                            Why are you rejecting this receipt?
                            <input
                              list={`rejection-reasons-${orderId}`}
                              value={reason}
                              disabled={pending}
                              onChange={(event) => onReasonChange(event.target.value)}
                              maxLength={500}
                              placeholder="Type a reason or choose a suggestion"
                              className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface p-3 font-normal text-foreground outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
                            />
                            <datalist id={`rejection-reasons-${orderId}`}>
                              {REJECTION_REASON_SUGGESTIONS.map((suggestion) => (
                                <option key={suggestion} value={suggestion} />
                              ))}
                            </datalist>
                          </label>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <SecondaryButton
                              disabled={pending}
                              onClick={() => {
                                onReasonChange("");
                                onRejectingChange(false);
                              }}
                            >
                              Cancel
                            </SecondaryButton>
                            <PrimaryButton
                              disabled={pending || !verified || reason.trim().length < 3}
                              onClick={() => onReview(false)}
                              className="bg-danger-foreground"
                            >
                              Confirm rejection
                            </PrimaryButton>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <SecondaryButton
                            disabled={pending}
                            onClick={() => onRejectingChange(true)}
                            className="border-danger-foreground text-danger-foreground"
                          >
                            Reject receipt
                          </SecondaryButton>
                          <PrimaryButton
                            disabled={
                              pending ||
                              !verified ||
                              proof.reported_amount !== total ||
                              !!referenceConflict
                            }
                            onClick={() => onReview(true)}
                          >
                            Approve payment
                          </PrimaryButton>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-control border p-4",
                        proof.status === "APPROVED"
                          ? "border-border bg-surface-muted text-brand"
                          : "border-danger-foreground/30 bg-danger/5 text-danger-foreground",
                      )}
                    >
                      {proof.status === "APPROVED" ? (
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
                      ) : (
                        <CircleX aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
                      )}
                      <div>
                        <p className="font-bold">
                          {proof.status === "APPROVED" ? "Payment approved" : "Receipt rejected"}
                        </p>
                        <p className="mt-1 leading-6">
                          {proof.status === "APPROVED"
                            ? "Payment was verified and the order was confirmed."
                            : proof.rejection_reason}
                        </p>
                      </div>
                    </div>
                  )}
                  {payment.submissions.slice(1).map((previous) => (
                    <p key={previous.id}>
                      <a
                        href={`/api/payment-receipts/${previous.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-sm font-bold text-brand underline decoration-border underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        Earlier receipt
                      </a>{" "}
                      · {previous.status.toLowerCase()}
                      {previous.rejection_reason ? `: ${previous.rejection_reason}` : ""}
                    </p>
                  ))}
                </>
              )}
            </>
          ) : null}

          {message && messageTone === "error" ? (
            <p
              role="alert"
              className="rounded-control bg-danger/5 p-4 leading-6 text-danger-foreground"
            >
              {message}
            </p>
          ) : null}
        </div>
      </section>

      {confirmDiscard ? (
        <DiscardChangesDialog
          dialogRef={discardDialogRef}
          onKeepEditing={keepEditing}
          onDiscard={discardChanges}
        />
      ) : null}
    </div>
  );
}
