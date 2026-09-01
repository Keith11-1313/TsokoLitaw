import type { PayMongoMode } from "@/lib/paymongo-mode";

export const PAYMONGO_PAYMENT_METHOD_TYPES = ["card", "gcash", "qrph"] as const;

export type PayMongoPaymentMethodType = typeof PAYMONGO_PAYMENT_METHOD_TYPES[number];

export interface PayMongoCheckoutInput {
  idempotencyKey: string;
  orderId: string;
  orderNumber: string;
  totalPhp: number;
  customerName: string;
  customerEmail: string;
  customerMobile?: string | null;
  successUrl: string;
  cancelUrl: string;
  paymentMethodTypes?: readonly PayMongoPaymentMethodType[];
}

export function requirePayMongoIdempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 255 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new Error("PayMongo idempotency key is invalid.");
  }
  return key;
}

export interface PayMongoCheckoutSession {
  id: string;
  checkoutUrl: string;
  livemode: boolean;
}

export type PayMongoRefundStatus = "pending" | "processing" | "succeeded" | "failed";

export interface PayMongoRefund {
  id: string;
  paymentId: string;
  amountPhp: number;
  currency: "PHP";
  status: PayMongoRefundStatus;
  livemode: boolean;
}

interface PayMongoCheckoutResponse {
  data?: {
    id?: unknown;
    attributes?: {
      checkout_url?: unknown;
      livemode?: unknown;
    };
  };
}

function requireRedirectUrl(value: string, fieldName: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be an absolute URL.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${fieldName} must use HTTP or HTTPS.`);
  }
  return url.toString();
}

export function phpToCentavos(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("PayMongo amount must be greater than zero.");
  }
  const centavos = Math.round(value * 100);
  if (!Number.isSafeInteger(centavos)) {
    throw new Error("PayMongo amount is outside the supported range.");
  }
  return centavos;
}

export function buildPayMongoCheckoutPayload(input: PayMongoCheckoutInput) {
  const orderNumber = input.orderNumber.trim();
  const customerName = input.customerName.trim();
  const customerEmail = input.customerEmail.trim();
  const customerMobile = input.customerMobile?.trim() || undefined;
  if (!orderNumber || !customerName || !customerEmail) {
    throw new Error("Order number, customer name, and customer email are required.");
  }

  const paymentMethodTypes = input.paymentMethodTypes?.length
    ? [...new Set(input.paymentMethodTypes)]
    : [...PAYMONGO_PAYMENT_METHOD_TYPES];

  return {
    data: {
      attributes: {
        billing: {
          name: customerName,
          email: customerEmail,
          ...(customerMobile ? { phone: customerMobile } : {}),
        },
        cancel_url: requireRedirectUrl(input.cancelUrl, "PayMongo cancel URL"),
        description: `Campus pickup order ${orderNumber}`,
        line_items: [{
          name: `TsokoLitaw order ${orderNumber}`,
          description: "Chocolate-filled Litaw for campus pickup",
          amount: phpToCentavos(input.totalPhp),
          currency: "PHP",
          quantity: 1,
        }],
        metadata: {
          order_id: input.orderId,
          order_number: orderNumber,
        },
        payment_method_types: paymentMethodTypes,
        reference_number: orderNumber,
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        success_url: requireRedirectUrl(input.successUrl, "PayMongo success URL"),
      },
    },
  };
}

export function parsePayMongoCheckoutSession(
  response: PayMongoCheckoutResponse,
  mode: PayMongoMode,
): PayMongoCheckoutSession {
  const id = response.data?.id;
  const checkoutUrl = response.data?.attributes?.checkout_url;
  const livemode = response.data?.attributes?.livemode;
  if (typeof id !== "string" || !id.startsWith("cs_")) {
    throw new Error("PayMongo did not return a valid checkout session ID.");
  }
  if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://checkout.paymongo.com/")) {
    throw new Error("PayMongo did not return a valid checkout URL.");
  }
  const expectedLivemode = mode === "live";
  if (livemode !== expectedLivemode) {
    throw new Error(`PayMongo ${mode} mode was expected but the response mode did not match.`);
  }
  return { id, checkoutUrl, livemode };
}

export function buildPayMongoRefundPayload(input: {
  paymentId: string;
  amountPhp: number;
  orderNumber: string;
}) {
  if (!/^pay_[A-Za-z0-9_-]+$/.test(input.paymentId)) {
    throw new Error("A valid PayMongo payment ID is required.");
  }
  if (!/^TL-[0-9]{4,}$/.test(input.orderNumber)) {
    throw new Error("A valid TsokoLitaw order number is required.");
  }
  return {
    data: {
      attributes: {
        amount: phpToCentavos(input.amountPhp),
        payment_id: input.paymentId,
        reason: "requested_by_customer",
        notes: `Customer cancellation for ${input.orderNumber}`,
      },
    },
  };
}

export function parsePayMongoRefund(response: unknown, mode: PayMongoMode): PayMongoRefund {
  const document = response as {
    data?: {
      id?: unknown;
      type?: unknown;
      attributes?: Record<string, unknown>;
    };
  };
  const id = document.data?.id;
  const attributes = document.data?.attributes;
  const paymentId = attributes?.payment_id;
  const amount = attributes?.amount;
  const currency = attributes?.currency;
  const status = attributes?.status;
  const livemode = attributes?.livemode;
  if (typeof id !== "string" || !/^ref_[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("PayMongo did not return a valid refund ID.");
  }
  if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9_-]+$/.test(paymentId)) {
    throw new Error("PayMongo did not return the refunded payment ID.");
  }
  if (!Number.isSafeInteger(amount) || Number(amount) <= 0 || currency !== "PHP") {
    throw new Error("PayMongo returned an invalid refund amount.");
  }
  if (!["pending", "processing", "succeeded", "failed"].includes(String(status))) {
    throw new Error("PayMongo returned an invalid refund status.");
  }
  const expectedLivemode = mode === "live";
  if (livemode !== expectedLivemode) {
    throw new Error(`PayMongo ${mode} mode was expected but the refund mode did not match.`);
  }
  return {
    id,
    paymentId,
    amountPhp: Number(amount) / 100,
    currency: "PHP",
    status: status as PayMongoRefundStatus,
    livemode,
  };
}
