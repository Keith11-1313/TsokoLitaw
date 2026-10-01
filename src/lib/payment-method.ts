import "server-only";

export type PaymentMode = "automatic" | "manual";
export type CheckoutPaymentMethod = "paymongo" | "manual_gcash" | "pay_at_counter";

export function getPaymentMode(): PaymentMode {
  const value = process.env.PAYMENT_MODE;
  if (value !== "automatic" && value !== "manual") {
    throw new Error("Invalid or missing PAYMENT_MODE configuration.");
  }
  return value;
}

export function getCheckoutPaymentOptions(): readonly CheckoutPaymentMethod[] {
  return getPaymentMode() === "automatic"
    ? (["paymongo"] as const)
    : (["manual_gcash", "pay_at_counter"] as const);
}

export function resolveCheckoutPaymentMethod(value: string): CheckoutPaymentMethod {
  const options = getCheckoutPaymentOptions();
  if (!options.includes(value as CheckoutPaymentMethod)) {
    throw new Error("That payment method is unavailable.");
  }
  return value as CheckoutPaymentMethod;
}
