import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export function OrderRequestForm() {
  return (
    <form
      aria-label="Order request"
      className="rounded-card border border-border bg-surface p-6 sm:p-8 lg:p-[2.375rem]"
    >
      <div className="space-y-[1.40625rem]">
        <FormField
          id="order-email"
          label="Email Address"
          inputProps={{
            type: "email",
            autoComplete: "email",
            placeholder: "e.g. maria@gmail.com",
          }}
        />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
          <FormField id="order-selection" label="Your Selection" as="select">
            <option>Choco Litaw (Box of 4)</option>
            <option>Cha-cha Litaw (Box of 4)</option>
            <option>SB Litaw (Box of 4)</option>
            <option>Caramel Litaw (Box of 4)</option>
          </FormField>
          <FormField id="order-quantity" label="Quantity" as="select">
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
          </FormField>
        </div>

        <FormField
          id="delivery-address"
          label="Delivery Address"
          inputProps={{
            type: "text",
            autoComplete: "street-address",
            placeholder: "Enter complete street address and landmarks",
          }}
        />

        <FormField
          id="special-requests"
          label="Special Requests"
          as="textarea"
          controlClassName="min-h-[6.25rem]"
          textareaProps={{
            placeholder:
              "Let us know if you want toasted peanuts, extra chocolate, or specific delivery notes...",
          }}
        />

        <PrimaryButton
          className="min-h-[3.375rem] w-full rounded-control! text-base"
          type="button"
        >
          Submit Order
        </PrimaryButton>
      </div>
      <p className="sr-only">
        This preview form uses mock data and does not submit orders yet.
      </p>
    </form>
  );
}
