import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ClearPaidCart } from "@/components/checkout/clear-paid-cart";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { ManualReceiptForm } from "@/components/orders/manual-receipt-form";
import {
  ManualPaymentStatusPanel,
  type ManualPaymentPageState,
} from "@/components/orders/manual-payment-status-panel";
import { PaymentStatusRefresh } from "@/components/orders/payment-status-refresh";
import { requireCustomer } from "@/lib/auth";
import { formatPhp } from "@/lib/commerce";
import { getManualPayment, type ManualPaymentDetails } from "@/lib/server-manual-payment";
import { getCustomerOrderDetail } from "@/lib/server-orders";

export const metadata = {
  title: "GCash payment | TsokoLitaw",
  robots: { index: false, follow: false },
};

function ReceiptHistory({ payment }: { payment: ManualPaymentDetails }) {
  if (!payment.submissions.length) return null;

  return (
    <div className="space-y-3 border-t border-border pt-5">
      <h3 className="font-bold">Submitted receipts</h3>
      {payment.submissions.map((proof) => (
        <p key={proof.id} className="break-words text-sm leading-6">
          <a
            href={`/api/payment-receipts/${proof.id}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-brand underline"
          >
            View receipt
          </a>{" "}
          · {proof.reported_reference} · {proof.status.toLowerCase().replaceAll("_", " ")}
        </p>
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
        {paid ? <ClearPaidCart orderId={orderId} /> : null}
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
        >
          ← {order.orderNumber}
        </Link>
        <h1 className="mt-4 font-display text-4xl">GCash payment</h1>

        {accepting ? (
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-border bg-surface p-5 sm:p-8">
              <h2 className="text-sm font-bold">Amount due</h2>
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
                  <p className="mt-5 text-sm leading-6">
                    Scan or import this QR in your payment app. Check the recipient, then send
                    exactly {formatPhp(order.total)}. Your payment provider may charge a separate
                    transfer fee.
                  </p>
                  <p className="mt-3 text-sm leading-6">
                    Submit your receipt before{" "}
                    {new Date(payment.expiresAt!).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                    })}{" "}
                    in Philippine time. If you already paid, please do not pay again.
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
                <p
                  role="alert"
                  className="mb-5 rounded-control bg-warning-background p-4 text-sm leading-6"
                >
                  We couldn’t approve this receipt because {latest.rejection_reason}. Please upload
                  a corrected receipt within 15 minutes. If you already sent the payment, contact us
                  instead of paying again.
                </p>
              ) : null}
              <ManualReceiptForm orderId={orderId} />
              <PaymentStatusRefresh expiresAt={payment.expiresAt} />
              <div className="mt-6">
                <ReceiptHistory payment={payment} />
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
              <>
                <ReceiptHistory payment={payment} />
                {underReview ? <PaymentStatusRefresh showControl /> : null}
              </>
            ) : null}
          </ManualPaymentStatusPanel>
        )}
      </SiteContainer>
    </CustomerPageShell>
  );
}
