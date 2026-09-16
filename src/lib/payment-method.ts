import "server-only";

export function getPaymentMethod() {
  const value = process.env.PAYMENT_METHOD ?? "paymongo";
  if (value !== "paymongo" && value !== "manual_gcash")
    throw new Error("Invalid PAYMENT_METHOD configuration.");
  return value;
}
