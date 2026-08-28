"use server";

import { requireCustomer } from "@/lib/auth";
import { createPendingOrder } from "@/lib/server-checkout";
import { getOrCreatePayMongoCheckout } from "@/lib/server-payment";
import {
  enforceMutationRateLimit,
  MutationRateLimitError,
} from "@/lib/server-rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CheckoutCartInput } from "@/types/commerce";

export interface CheckoutSubmissionInput {
  checkoutKey: string;
  pickupWindowId: string;
  pickupLocationId: string;
  customerName: string;
  customerMobile: string;
  customerNotes: string;
  termsAccepted: boolean;
  items: CheckoutCartInput[];
}

export type CheckoutSubmissionResult =
  | {
    status: "success";
    orderId: string;
    orderNumber: string;
    total: number;
    created: boolean;
    checkoutUrl: string;
  }
  | { status: "error"; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidCartItem(item: CheckoutCartInput) {
  if (!UUID_PATTERN.test(item.variantId)) return false;
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return false;
  if (!Number.isInteger(item.addonQuantity) || item.addonQuantity < 0 || item.addonQuantity > 10) return false;
  if (item.addonId !== null && !UUID_PATTERN.test(item.addonId)) return false;
  if (!item.coatingCounts || typeof item.coatingCounts !== "object") return false;

  const allocations = Object.entries(item.coatingCounts);
  return allocations.length > 0 && allocations.every(([coatingId, count]) => (
    UUID_PATTERN.test(coatingId)
    && Number.isInteger(count)
    && count >= 0
    && count <= 8
  ));
}

function getValidationMessage(input: CheckoutSubmissionInput) {
  if (!UUID_PATTERN.test(input.checkoutKey)) return "Start a new checkout attempt and try again.";
  if (!UUID_PATTERN.test(input.pickupWindowId) || !UUID_PATTERN.test(input.pickupLocationId)) {
    return "Choose an available pickup date, time, and location.";
  }
  const customerName = input.customerName.trim();
  if (customerName.length < 2 || customerName.length > 100) {
    return "Enter a name between 2 and 100 characters.";
  }
  if (input.customerMobile.trim().length > 30) return "Mobile number must be 30 characters or fewer.";
  if (input.customerNotes.trim().length > 500) return "Order notes must be 500 characters or fewer.";
  if (!input.termsAccepted) return "Accept the Terms & Conditions before continuing.";
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    return "Your cart must contain between 1 and 20 configured boxes.";
  }
  if (!input.items.every(isValidCartItem)) return "One or more cart items are invalid. Rebuild the affected box and try again.";
  return null;
}

function getCheckoutErrorMessage(error: unknown) {
  const causeMessage = error instanceof Error && error.cause && typeof error.cause === "object" && "message" in error.cause
    ? String(error.cause.message)
    : "";

  if (causeMessage.includes("pickup option is unavailable")) return "That pickup option is no longer available. Refresh and choose another schedule.";
  if (causeMessage.includes("slot no longer has enough capacity")) return "That pickup slot does not have enough remaining capacity for all boxes in your cart. Reduce the total quantity or choose another schedule.";
  if (causeMessage.includes("Ready stock is no longer available")) return "Ready stock has just sold out for a selected box. Refresh your cart and try again.";
  if (causeMessage.includes("Account is not eligible")) return "This account is not eligible to start a new checkout.";
  return "The order could not be prepared. No payment was collected. Please try again.";
}

export async function submitPendingOrderAction(
  input: CheckoutSubmissionInput,
): Promise<CheckoutSubmissionResult> {
  const profile = await requireCustomer("/checkout");
  const validationMessage = getValidationMessage(input);
  if (validationMessage) return { status: "error", message: validationMessage };

  try {
    await enforceMutationRateLimit({
      scope: "checkout-create",
      userId: profile.id,
      maximumRequests: 6,
      windowSeconds: 60,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many checkout attempts. Try again in about ${error.retryAfterSeconds} seconds.`
        : "Checkout protection is temporarily unavailable. Please try again.",
    };
  }

  let result;
  try {
    result = await createPendingOrder({
      ...input,
      userId: profile.id,
      customerName: input.customerName.trim(),
      customerMobile: input.customerMobile.trim(),
      customerNotes: input.customerNotes.trim(),
    });
  } catch (error) {
    return { status: "error", message: getCheckoutErrorMessage(error) };
  }

  try {
    const checkoutUrl = await getOrCreatePayMongoCheckout(result.orderId, profile.id);
    return { status: "success", ...result, checkoutUrl };
  } catch {
    return {
      status: "error",
      message: `Pending order ${result.orderNumber} was saved, but secure payment could not be opened. No payment was collected. Please try again.`,
    };
  }
}

export async function resumePendingPaymentAction(
  orderId: string,
): Promise<CheckoutSubmissionResult> {
  const profile = await requireCustomer("/checkout");
  if (!UUID_PATTERN.test(orderId)) {
    return { status: "error", message: "That pending order could not be reopened." };
  }

  try {
    await enforceMutationRateLimit({
      scope: "checkout-resume",
      userId: profile.id,
      maximumRequests: 10,
      windowSeconds: 60,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MutationRateLimitError
        ? `Too many payment requests. Try again in about ${error.retryAfterSeconds} seconds.`
        : "Payment protection is temporarily unavailable. Please try again.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, total")
    .eq("id", orderId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (error || !order) {
    return { status: "error", message: "That pending order could not be reopened." };
  }

  try {
    const checkoutUrl = await getOrCreatePayMongoCheckout(order.id, profile.id);
    return {
      status: "success",
      orderId: order.id,
      orderNumber: order.order_number,
      total: Number(order.total),
      created: false,
      checkoutUrl,
    };
  } catch {
    return {
      status: "error",
      message: `Secure payment for order ${order.order_number} could not be reopened. No payment was collected. Please try again.`,
    };
  }
}
