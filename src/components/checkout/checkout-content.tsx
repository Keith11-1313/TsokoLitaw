"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  resumePendingPaymentAction,
  submitPendingOrderAction,
  type CheckoutSubmissionResult,
} from "@/app/checkout/actions";
import { useCart } from "@/components/cart/cart-provider";
import { OrderLineItems } from "@/components/orders/order-line-items";
import { PrimaryButton } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormField } from "@/components/ui/form-field";
import { calculateCartLineTotal, formatPhp } from "@/lib/commerce";
import type { AuthProfile } from "@/lib/auth";
import type { CustomerLoyaltyStatus } from "@/lib/server-loyalty";
import type { CheckoutAvailability } from "@/types/pickup";

interface CheckoutContentProps {
  availability: CheckoutAvailability;
  profile: AuthProfile;
  loyalty: CustomerLoyaltyStatus;
  resumeOrderId: string | null;
}

export function CheckoutContent({ availability, profile, loyalty, resumeOrderId }: CheckoutContentProps) {
  const { selectedItems, selectedSubtotal, markSelectedItemsPendingCheckout } = useCart();
  const checkoutKeyRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState(profile.fullName);
  const [customerMobile, setCustomerMobile] = useState(profile.mobileNumber ?? "");
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [useReward, setUseReward] = useState(false);
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
        loyaltyRewardId: useReward && selectedItems.some((item) => item.pieceCount === 4)
          ? loyalty.availableRewards[0]?.id ?? null
          : null,
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
  const requestedPieces = selectedItems.reduce(
    (total, item) => total + item.pieceCount * item.quantity,
    0,
  );
  const remainingPieces = selectedDate?.remainingPieces ?? null;
  const exceedsPreparedStock = remainingPieces !== null && requestedPieces > remainingPieces;
  const availableReward = loyalty.availableRewards[0] ?? null;
  const eligibleRewardBoxes = selectedItems.filter((item) => item.pieceCount === 4);
  const rewardDiscount = useReward && availableReward && eligibleRewardBoxes.length
    ? Math.min(...eligibleRewardBoxes.map((item) => item.boxPrice))
    : 0;
  const checkoutTotal = Math.max(selectedSubtotal - rewardDiscount, 0);
  const orderSummaryItems = selectedItems.map((item) => ({
    id: item.id,
    name: item.variantLabel,
    quantity: item.quantity,
    lineTotal: calculateCartLineTotal(item),
    basePrice: item.boxPrice,
    coatingTotal: item.extraCoatingCharge,
    coatings: Object.entries(item.coatingCounts)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => `${item.coatingNames[id] ?? "Coating"} × ${count}`),
    addon: item.addonQuantity > 0 ? {
      name: item.addonName ?? "Add-on",
      quantity: item.addonQuantity,
      lineTotal: item.addonPrice * item.addonQuantity,
    } : null,
  }));
  const customerDetailsValid = customerName.trim().length >= 2
    && customerName.trim().length <= 100
    && customerMobile.trim().length <= 30
    && customerNotes.trim().length <= 500;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.25fr_.75fr]">
      <form className="order-2 min-w-0 space-y-6 lg:order-1" aria-label="Checkout information" onSubmit={submitOrder}>
        <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl">Customer information</h2>
          <p className="mt-2 text-sm text-muted-foreground">We’ll use your Google email as the main way to contact you about your order.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <FormField id="checkout-name" label="Full name" required error={submission?.fieldErrors?.customerName} inputProps={{ value: customerName, onChange: (event) => setCustomerName(event.target.value), autoComplete: "name", minLength: 2, maxLength: 100 }} />
            <FormField id="checkout-email" label="Google email" inputProps={{ defaultValue: profile.email, readOnly: true }} />
            <FormField id="checkout-mobile" label="Mobile number (optional)" error={submission?.fieldErrors?.customerMobile} hint="Add a number only if you also want pickup updates by phone." inputProps={{ value: customerMobile, onChange: (event) => setCustomerMobile(event.target.value), placeholder: "+63 900 000 0000", autoComplete: "tel", maxLength: 30 }} />
          </div>
        </section>

        {availableReward ? (
          <section className="rounded-card border border-border bg-surface p-6 sm:p-8" aria-labelledby="checkout-reward-title">
            <h2 id="checkout-reward-title" className="font-display text-2xl">Loyalty reward</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Use one reward for the base price of one 4-piece box. Coating and add-on charges remain payable.</p>
            <label className="mt-5 flex items-start gap-3 rounded-control bg-success-background p-4 text-sm text-success-foreground">
              <input
                type="checkbox"
                checked={useReward}
                onChange={(event) => setUseReward(event.target.checked)}
                disabled={!eligibleRewardBoxes.length}
                className="mt-0.5 size-4 accent-brand"
              />
              <span>
                <strong className="block">Apply free 4-piece reward</strong>
                <span className="mt-1 block text-xs">
                  {eligibleRewardBoxes.length
                    ? `${loyalty.availableRewards.length} reward${loyalty.availableRewards.length === 1 ? "" : "s"} available.`
                    : "Select a 4-piece box in your cart to use this reward."}
                </span>
              </span>
            </label>
          </section>
        ) : null}

        <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl">Campus pickup</h2>
          {hasPickupAvailability ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <CustomSelect label="Pickup date" value={dateId} onChange={changeDate} options={availability.dates.map((date) => ({ value: date.id, label: date.label }))} />
              <CustomSelect label="Pickup time" value={selectedWindow.id} onChange={changeWindow} options={selectedDate.windows.map((window) => ({ value: window.id, label: window.label }))} />
              <CustomSelect className="sm:col-span-2" label="Pickup location" value={locationId} onChange={setLocationId} options={selectedWindow.locations.map((location) => ({ value: location.id, label: location.name }))} />
              {remainingPieces !== null ? (
                <div role={exceedsPreparedStock ? "alert" : "status"} className={`sm:col-span-2 rounded-control p-4 text-sm leading-6 ${exceedsPreparedStock ? "bg-danger-background font-bold text-danger-foreground" : "bg-success-background text-success-foreground"}`}>
                  {exceedsPreparedStock
                    ? `This cart needs ${requestedPieces} pieces, but only ${remainingPieces} remain for this pickup date. Return to your cart and reduce the box quantities or select another date.`
                    : `${remainingPieces} prepared pieces remain for this date. Your selected cart uses ${requestedPieces}.`}
                </div>
              ) : null}
              <FormField id="checkout-notes" label="Order notes (optional)" error={submission?.fieldErrors?.customerNotes} className="sm:col-span-2" inputProps={{ value: customerNotes, onChange: (event) => setCustomerNotes(event.target.value), placeholder: "Pickup or preparation notes", maxLength: 500 }} />
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
        {!customerDetailsValid ? <p className="text-center text-xs font-bold text-danger-foreground">Complete the customer details before continuing.</p> : null}
        <PrimaryButton type="submit" disabled={!customerDetailsValid || !hasPickupAvailability || exceedsPreparedStock || !termsAccepted || isPending || submission?.status === "success"} className="w-full rounded-control!">
          {!hasPickupAvailability ? "Pickup unavailable" : exceedsPreparedStock ? "Reduce cart quantities" : isPending ? "Opening secure payment…" : submission?.status === "success" ? "Opening PayMongo…" : "Continue to payment"}
        </PrimaryButton>
      </form>

      <aside className="order-1 min-w-0 overflow-hidden rounded-card border border-border bg-surface lg:order-2 lg:sticky lg:top-6">
        <div className="border-b border-border bg-surface-muted px-6 py-5">
          <h2 className="font-display text-3xl">Order summary</h2>
        </div>
        <div className="px-6 py-5">
          <OrderLineItems items={orderSummaryItems} />
        </div>
        <div className="border-t border-border bg-surface-muted px-6 py-5">
          <div className="space-y-2 text-sm">
            {rewardDiscount > 0 ? <div className="flex justify-between gap-4 font-bold text-success-foreground"><span>Loyalty reward</span><span>−{formatPhp(rewardDiscount)}</span></div> : null}
          </div>
          <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total</span>
            <strong className="font-display text-3xl text-brand">{formatPhp(checkoutTotal)}</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
