import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export function CheckoutForm() {
  return (
    <form className="space-y-6" aria-label="Checkout information">
      <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl">Customer information</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <FormField id="checkout-name" label="Full Name" inputProps={{ placeholder: "Maria Santos", autoComplete: "name" }} />
          <FormField id="checkout-email" label="Email" inputProps={{ type: "email", placeholder: "maria@gmail.com", autoComplete: "email" }} />
          <FormField id="checkout-mobile" label="Mobile Number" inputProps={{ type: "tel", placeholder: "+63 900 000 0000", autoComplete: "tel" }} />
          <FormField id="checkout-notes" label="Order Notes" inputProps={{ placeholder: "Optional preparation notes" }} />
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl">Pickup details</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <FormField id="pickup-date" label="Pickup Date" as="select">
            <option>Saturday, October 18, 2025</option>
            <option>Monday, October 20, 2025</option>
          </FormField>
          <FormField id="pickup-time" label="Pickup Time" as="select">
            <option>2:00 PM</option>
            <option>3:00 PM</option>
            <option>4:00 PM</option>
          </FormField>
          <FormField className="sm:col-span-2" id="pickup-location" label="Pickup Location" as="select">
            <option>UCC North Congress Campus, Caloocan</option>
          </FormField>
        </div>
      </section>

      <label className="flex items-start gap-3 rounded-card border border-border bg-surface p-5 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-1 size-4 accent-brand" />
        <span>
          I agree to the Terms &amp; Conditions, allergen notice, pickup window,
          and cancellation policy.
        </span>
      </label>

      <PrimaryButton className="w-full rounded-control! text-base" type="button">
        Continue to Payment
      </PrimaryButton>
    </form>
  );
}
