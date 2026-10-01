import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { ManualReceiptForm } from "@/components/orders/manual-receipt-form";
import {
  ManualPaymentStatusPanel,
  type ManualPaymentPageState,
} from "@/components/orders/manual-payment-status-panel";
import { PaymentDeadline } from "@/components/orders/payment-status-refresh";
import { requireCustomer } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getManualPayment, type ManualPaymentDetails } from "@/lib/server-manual-payment";
import { getCustomerOrderDetail } from "@/lib/server-orders";

export const metadata = {
  title: "GCash payment | TsokoLitaw",
  robots: { index: false, follow: false },
};

function ReceiptHistory({
  payment,
  orderNumber,
}: {
  payment: ManualPaymentDetails;
  orderNumber: string;
}) {
  if (!payment.submissions.length) return null;

  return (
    <div className="space-y-4 border-t border-border pt-5">
      <h3 className="font-display text-xl">
        {payment.submissions.length === 1 ? "Your submitted receipt" : "Your submitted receipts"}
      </h3>
      {payment.submissions.map((proof, index) => (
        <figure
          key={proof.id}
          className="grid overflow-hidden rounded-control border border-border bg-surface-muted md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        >
          <div className="flex min-w-0 flex-col border-b border-border md:border-r md:border-b-0">
            <div className="flex min-h-72 flex-1 items-center justify-center p-3 sm:p-5">
              {/* Private owner-authorized route; do not send it through the public image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/payment-receipts/${proof.id}`}
                alt={`GCash receipt for ${orderNumber}${index ? `, earlier submission ${index + 1}` : ""}`}
                className="max-h-[32rem] h-auto max-w-full object-contain"
              />
            </div>
            <a
              href={`/api/payment-receipts/${proof.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center border-t border-border bg-surface px-4 text-sm font-bold text-brand underline underline-offset-4"
            >
              Open full size
            </a>
          </div>
          <figcaption className="min-w-0 bg-surface p-5 text-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {index === 0 ? "Latest submission" : `Earlier submission ${index + 1}`}
            </p>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1 font-bold text-brand">
                  {proof.status === "UNDER_REVIEW"
                    ? "Under review"
                    : proof.status === "APPROVED"
                      ? "Approved"
                      : "Rejected"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Amount
                </dt>
                <dd className="mt-1 font-bold">{formatPhp(proof.reported_amount)}</dd>
              </div>
              <div className="sm:col-span-2 md:col-span-1 lg:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Reference
                </dt>
                <dd className="mt-1 break-all font-bold">{proof.reported_reference}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Date and time
                </dt>
                <dd className="mt-1">
                  {new Date(proof.reported_paid_at).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  PHT
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Recipient
                </dt>
                <dd className="mt-1 break-words">{proof.reported_recipient}</dd>
              </div>
            </dl>
            {proof.rejection_reason ? (
              <div className="mt-5 rounded-control bg-warning-background p-4 leading-6 text-warning-foreground">
                <p className="font-bold">Reason for rejection</p>
                <p className="mt-1">{proof.rejection_reason}</p>
              </div>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default async function ManualPaymentPage({
  params,
}: PageProps<"/orders/[orderId]/payment">) {
  const { orderId } = await params;
  const profile = await requireCustomer(`/orders/${orderId}/payment`);
  // This owned order read synchronizes overdue direct payments before rendering either view.
  const order = await getCustomerOrderDetail(profile.id, orderId);
  if (!order) notFound();
  const payment = await getManualPayment(orderId);
  if (!payment) notFound();

  const { accepting } = payment;
  const qr =
    accepting && payment.manual_qr_payload
      ? await QRCode.toDataURL(payment.manual_qr_payload, {
          width: 360,
          margin: 4,
          errorCorrectionLevel: "M",
        })
      : null;
  const latest = payment.submissions[0];
  const underReview = payment.status === "UNDER_REVIEW";
  const paid = payment.status === "PAID";
  const cancelled = order.status === "CANCELLED";
  const closedState: ManualPaymentPageState = underReview
    ? "under_review"
    : paid
      ? "paid"
      : cancelled
        ? "cancelled"
        : "expired";

  return (
    <CustomerPageShell>
      <SiteContainer className="py-8 sm:py-12">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back
        </Link>
        <h1 className="mt-4 font-display text-4xl">GCash payment</h1>

        {accepting ? (
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-border bg-surface p-5 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-sm font-bold">Amount due</h2>
                <p className="text-sm font-bold text-muted-foreground">{order.orderNumber}</p>
              </div>
              <p className="mt-2 font-display text-4xl">{formatPhp(order.total)}</p>
              <p className="mt-3 text-sm">
                Pay to: <strong>{payment.recipientName}</strong>
              </p>
              {qr ? (
                <>
                  {/* A generated data URL, not remote content. Preserve the QR quiet zone. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr}
                    alt={`GCash QR for ${formatPhp(order.total)}`}
                    width={360}
                    height={360}
                    className="mx-auto mt-5 h-auto w-full max-w-[360px]"
                  />
                  <a
                    href={qr}
                    download={`${order.orderNumber}-gcash.png`}
                    className="flex min-h-12 items-center justify-center rounded-full border border-brand font-bold text-brand"
                  >
                    Save QR
                  </a>
                  <h3 className="mt-5 font-display text-xl">Scan to pay</h3>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
                    <li>Scan or import the QR in your payment app.</li>
                    <li>Check that the recipient is {payment.recipientName}.</li>
                    <li>Send exactly {formatPhp(order.total)}.</li>
                  </ol>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Your payment provider may charge a separate transfer fee.
                  </p>
                  <PaymentDeadline expiresAt={payment.expiresAt!} />
                  <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                    Upload your completed receipt before the deadline. If you already paid, please
                    do not pay again.
                  </p>
                </>
              ) : (
                <p role="alert" className="mt-5 text-sm leading-6 text-danger-foreground">
                  We couldn’t load the payment QR. Go back to your order and try again.
                </p>
              )}
            </section>

            <section className="rounded-card border border-border bg-surface p-5 sm:p-8">
              <h2 className="mb-5 font-display text-2xl">
                {latest?.status === "REJECTED"
                  ? "Correct your payment receipt"
                  : "Submit payment receipt"}
              </h2>
              {latest?.status === "REJECTED" ? (
                <div
                  role="alert"
                  className="mb-5 rounded-control bg-warning-background p-4 text-sm leading-6"
                >
                  <p className="font-bold">We couldn’t approve this payment receipt.</p>
                  <p className="mt-1">Reason: {latest.rejection_reason}</p>
                  <p className="mt-1">
                    Upload a corrected receipt within 15 minutes. If you already sent the payment,
                    contact us instead of paying again.
                  </p>
                </div>
              ) : null}
              <ManualReceiptForm
                orderId={orderId}
                expectedAmount={order.total}
                orderCreatedAt={order.orderedAt}
              />
              <div className="mt-6">
                <ReceiptHistory payment={payment} orderNumber={order.orderNumber} />
              </div>
            </section>
          </div>
        ) : (
          <ManualPaymentStatusPanel
            state={closedState}
            orderId={orderId}
            orderNumber={order.orderNumber}
          >
            {underReview || paid ? (
              <ReceiptHistory payment={payment} orderNumber={order.orderNumber} />
            ) : null}
          </ManualPaymentStatusPanel>
        )}
      </SiteContainer>
    </CustomerPageShell>
  );
}
