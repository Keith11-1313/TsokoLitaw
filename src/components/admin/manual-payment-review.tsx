"use client";
import { useState, useTransition } from "react";
import { loadManualPaymentAction, reviewManualPaymentAction } from "@/app/admin/orders/actions";
import type { ManualPaymentDetails } from "@/lib/server-manual-payment";
import { formatPhp } from "@/lib/commerce";
import { getPaymentStatusLabel } from "@/lib/payment-status";

export function ManualPaymentReview({ orderId, total }: { orderId: string; total: number }) {
  const [payment, setPayment] = useState<ManualPaymentDetails | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [pending, startTransition] = useTransition();
  function load() {
    startTransition(async () => {
      try {
        setPayment(await loadManualPaymentAction(orderId));
      } catch {
        setMessage("We couldn’t load the payment details. Please try again.");
      }
    });
  }
  const proof = payment?.submissions[0];
  function review(approve: boolean) {
    if (!proof || pending) return;
    startTransition(async () => {
      try {
        const result = await reviewManualPaymentAction({
          submissionId: proof.id,
          approve,
          reason,
          verified,
        });
        setMessage(result.message);
        if (result.status === "success") {
          setVerified(false);
          setReason("");
          setPayment(await loadManualPaymentAction(orderId));
        }
      } catch {
        setMessage("We lost the connection. Refresh the payment details before trying again.");
      }
    });
  }
  return (
    <section className="mt-5 space-y-4 border-t border-border pt-4 text-sm">
      <h3 className="font-bold">Manual GCash: expected {formatPhp(total)}</h3>
      <button
        type="button"
        disabled={pending}
        onClick={load}
        className="min-h-11 rounded-full border border-brand px-4 font-bold disabled:opacity-50"
      >
        {payment ? "Refresh receipts" : "Load payment receipts"}
      </button>
      {payment ? (
        <>
          <p>Payment: {getPaymentStatusLabel(payment.status, "manual_gcash")}</p>
          <p>
            Expected recipient: <strong>{payment.recipientName}</strong>
          </p>
          {!proof ? (
            <p>No receipt submitted yet.</p>
          ) : (
            <>
              <dl className="space-y-2 break-words">
                <div>
                  <dt className="font-bold">Submitted amount</dt>
                  <dd>
                    {formatPhp(proof.reported_amount)}
                    {proof.reported_amount !== total ? " (does not match)" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Reference</dt>
                  <dd>{proof.reported_reference}</dd>
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
              <a
                className="inline-flex min-h-11 items-center underline"
                href={`/api/payment-receipts/${proof.id}`}
                target="_blank"
                rel="noreferrer"
              >
                View original receipt
              </a>
              {proof.status === "UNDER_REVIEW" ? (
                <>
                  <p className="leading-6">
                    Check the actual GCash transaction before deciding. Confirm the recipient,
                    amount, reference number and time. The receipt image alone does not prove that
                    the payment arrived.
                  </p>
                  <label className="flex items-start gap-2 leading-6">
                    <input
                      type="checkbox"
                      checked={verified}
                      disabled={pending}
                      onChange={(e) => setVerified(e.target.checked)}
                      className="mt-1 size-5 shrink-0"
                    />
                    I found this payment in the receiving GCash account and checked its details.
                  </label>
                  <label className="block">
                    Reason if rejecting
                    <textarea
                      value={reason}
                      disabled={pending}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      className="mt-2 min-h-24 w-full rounded-control border border-border bg-surface p-3"
                    />
                  </label>
                  <p className="text-xs leading-5">
                    Approving confirms the order and queues its confirmation email. A rejection
                    gives the customer 15 minutes to send a corrected receipt. If they do not, the
                    unpaid order can expire.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={pending || !verified || reason.trim().length < 3}
                      onClick={() => review(false)}
                      className="min-h-11 rounded-full border border-brand px-4 font-bold disabled:opacity-50"
                    >
                      Reject receipt
                    </button>
                    <button
                      type="button"
                      disabled={pending || !verified || proof.reported_amount !== total}
                      onClick={() => review(true)}
                      className="min-h-11 rounded-full bg-brand px-4 font-bold text-surface disabled:opacity-50"
                    >
                      Approve payment
                    </button>
                  </div>
                </>
              ) : (
                <p>
                  {proof.status.toLowerCase()}
                  {proof.rejection_reason ? `: ${proof.rejection_reason}` : ""}
                </p>
              )}
              {payment.submissions.slice(1).map((previous) => (
                <p key={previous.id}>
                  <a
                    href={`/api/payment-receipts/${previous.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
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
      <p role="status" className="leading-6">
        {message}
      </p>
    </section>
  );
}
