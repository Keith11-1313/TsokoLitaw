"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  resumePendingPaymentAction,
  submitPendingOrderAction,
  type CheckoutSubmissionResult,
} from "@/app/checkout/actions";
import { useCart } from "@/components/cart/cart-provider";
import { PrimaryButton } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormField } from "@/components/ui/form-field";
import { calculateCartLineTotal, formatPhp } from "@/lib/commerce";
import type { AuthProfile } from "@/lib/auth";
import type { CheckoutAvailability } from "@/types/pickup";

interface CheckoutContentProps {
  availability: CheckoutAvailability;
  profile: AuthProfile;
  resumeOrderId: string | null;
}

export function CheckoutContent({ availability, profile, resumeOrderId }: CheckoutContentProps) {
  const { selectedItems, selectedSubtotal, markSelectedItemsPendingCheckout } = useCart();
  const checkoutKeyRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState(profile.fullName);
  const [customerMobile, setCustomerMobile] = useState(profile.mobileNumber ?? "");
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submission, setSubmission] = useState<CheckoutSubmissionResult | null>(null);
  const [dateId, setDateId] = useState(availability.dates[0]?.id ?? "");
  const selectedDate = availability.dates.find((date) => date.id === dateId)
    ?? availability.dates[0];
  const [windowId, setWindowId] = useState(selectedDate?.windows[0]?.id ?? "");
  const selectedWindow = selectedDate?.windows.find((window) => window.id === windowId)
    ?? selectedDate?.windows[0];
  const [locationId, setLocationId] = useState(selectedWindow?.locations[0]?.id ?? "");

  function changeDate(nextDateId: string) {
    const nextDate = availability.dates.find((date) => date.id === nextDateId);
    const nextWindow = nextDate?.windows[0];
    setDateId(nextDateId);
    setWindowId(nextWindow?.id ?? "");
    setLocationId(nextWindow?.locations[0]?.id ?? "");
  }

  function changeWindow(nextWindowId: string) {
    const nextWindow = selectedDate?.windows.find((window) => window.id === nextWindowId);
    setWindowId(nextWindowId);
    setLocationId(nextWindow?.locations[0]?.id ?? "");
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWindow || !locationId || isPending || submission?.status === "success") return;
    checkoutKeyRef.current ??= crypto.randomUUID();

    startTransition(async () => {
      const result = await submitPendingOrderAction({
        checkoutKey: checkoutKeyRef.current!,
        pickupWindowId: selectedWindow.id,
        pickupLocationId: locationId,
        customerName,
        customerMobile,
        customerNotes,
        termsAccepted,
        items: selectedItems.map((item) => ({
          variantId: item.variantId,
          coatingCounts: item.coatingCounts,
          addonId: item.addonId,
          addonQuantity: item.addonQuantity,
          quantity: item.quantity,
        })),
      });
      setSubmission(result);
      if (result.status === "success") {
        markSelectedItemsPendingCheckout();
        window.location.assign(result.checkoutUrl);
      }
    });
  }

  function resumePayment() {
    if (!resumeOrderId || isPending) return;
    startTransition(async () => {
      const result = await resumePendingPaymentAction(resumeOrderId);
      setSubmission(result);
      if (result.status === "success") {
        window.location.assign(result.checkoutUrl);
      }
    });
  }

  if (resumeOrderId) {
    return (
      <section className="mx-auto max-w-2xl rounded-card border border-border bg-surface p-7 text-center sm:p-10">
        <h2 className="font-display text-3xl">Payment was cancelled</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          No payment was confirmed. Reopen the same pending order below so another order and stock reservation are not created.
        </p>
        {submission?.status === "error" ? (
          <p role="alert" className="mt-5 rounded-control bg-danger-background p-4 text-sm font-bold text-danger-foreground">{submission.message}</p>
        ) : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryButton type="button" onClick={resumePayment} disabled={isPending}>
            {isPending ? "Reopening secure payment…" : "Return to secure payment"}
          </PrimaryButton>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-6 text-sm font-bold text-brand">
            Return home
          </Link>
        </div>
      </section>
    );
  }

  if (!selectedItems.length) {
    return (
      <section className="rounded-card border border-border bg-surface p-8 text-center">
        <h2 className="font-display text-2xl">Nothing to check out yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">Select at least one cart item before continuing.</p>
        <Link href="/cart" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-bold text-surface">Return to cart</Link>
      </section>
    );
  }

  const hasPickupAvailability = Boolean(selectedDate && selectedWindow && locationId);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.25fr_.75fr]">
      <form className="min-w-0 space-y-6" aria-label="Checkout information" onSubmit={submitOrder}>
        <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl">Customer information</h2>
          <p className="mt-2 text-sm text-muted-foreground">We’ll use your Google email as the main way to contact you about your order.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <FormField id="checkout-name" label="Full name" required inputProps={{ value: customerName, onChange: (event) => setCustomerName(event.target.value), autoComplete: "name", maxLength: 100 }} />
            <FormField id="checkout-email" label="Google email" inputProps={{ defaultValue: profile.email, readOnly: true }} />
            <FormField id="checkout-mobile" label="Mobile number (optional)" hint="Add a number only if you also want pickup updates by phone." inputProps={{ value: customerMobile, onChange: (event) => setCustomerMobile(event.target.value), placeholder: "+63 900 000 0000", autoComplete: "tel", maxLength: 30 }} />
            <FormField id="checkout-notes" label="Order notes" inputProps={{ value: customerNotes, onChange: (event) => setCustomerNotes(event.target.value), placeholder: "Optional preparation notes", maxLength: 500 }} />
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl">Campus pickup</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin publishes the actual available dates within {availability.operatingDays}, {availability.operatingHours}. Same-day options appear only when ready stock is available. Please arrive within the {availability.graceMinutes}-minute grace period.
          </p>
          {hasPickupAvailability ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <CustomSelect label="Pickup date" value={dateId} onChange={changeDate} options={availability.dates.map((date) => ({ value: date.id, label: date.label }))} />
              <CustomSelect label="Pickup time" value={selectedWindow.id} onChange={changeWindow} options={selectedDate.windows.map((window) => ({ value: window.id, label: window.label }))} />
              <CustomSelect className="sm:col-span-2" label="Pickup location" value={locationId} onChange={setLocationId} options={selectedWindow.locations.map((location) => ({ value: location.id, label: location.name }))} />
            </div>
          ) : (
            <div role="status" className="mt-6 rounded-control bg-warning-background p-4 text-sm leading-6 text-warning-foreground">
              No pickup schedule is currently published. Please check again after TsokoLitaw announces its next campus availability.
            </div>
          )}
        </section>

        <label className="flex items-start gap-3 rounded-card border border-border bg-surface p-5 text-sm text-muted-foreground">
          <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 size-4 accent-brand" />
          <span>I agree to the <Link className="font-bold underline" href="/terms">Terms &amp; Conditions</Link> and acknowledge the <Link className="font-bold underline" href="/privacy">Privacy Policy</Link>, allergen notice, pickup window, and no-show policy.</span>
        </label>
        {submission?.status === "error" ? (
          <p role="alert" className="rounded-control bg-danger-background p-4 text-sm font-bold text-danger-foreground">{submission.message}</p>
        ) : null}
        <PrimaryButton type="submit" disabled={!hasPickupAvailability || !termsAccepted || isPending || submission?.status === "success"} className="w-full rounded-control!">
          {!hasPickupAvailability ? "Pickup unavailable" : isPending ? "Opening secure payment…" : submission?.status === "success" ? "Opening PayMongo…" : "Continue to secure payment"}
        </PrimaryButton>
        <p className="text-center text-xs leading-5 text-muted-foreground">You’ll complete payment on PayMongo’s secure test checkout. Your order is confirmed only after TsokoLitaw receives PayMongo’s signed payment notification.</p>
      </form>

      <aside className="min-w-0 rounded-card border border-border bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="font-display text-2xl">Order summary</h2>
        <ul className="mt-5 divide-y divide-border">
          {selectedItems.map((item) => (
            <li key={item.id} className="py-4 first:pt-0">
              <div className="flex justify-between gap-3">
                <span className="font-bold">Box of {item.pieceCount} × {item.quantity}</span>
                <span>{formatPhp(calculateCartLineTotal(item))}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {Object.entries(item.coatingCounts)
                  .filter(([, count]) => count > 0)
                  .map(([id, count]) => `${item.coatingNames[id]} × ${count}`)
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-bold">
          <span>Browser estimate</span>
          <span>{formatPhp(selectedSubtotal)}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Final prices and availability will be recalculated by the server before an order is created.</p>
        <div className="mt-6 space-y-2 rounded-control bg-warning-background p-4 text-xs leading-5 text-warning-foreground">
          <p>May contain peanuts, dairy, coconut, sesame, and chocolate ingredients.</p>
          <p>Missed pickups are non-refundable because the order has already been prepared.</p>
        </div>
      </aside>
    </div>
  );
}
