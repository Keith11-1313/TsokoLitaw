import "server-only";

import {
  buildPayMongoCheckoutPayload,
  buildPayMongoRefundPayload,
  parsePayMongoCheckoutSession,
  parsePayMongoRefund,
  requirePayMongoIdempotencyKey,
  type PayMongoCheckoutInput,
  type PayMongoCheckoutSession,
  type PayMongoRefund,
} from "@/lib/paymongo-contract";
import { getPayMongoMode, requirePayMongoSecretKey } from "@/lib/paymongo-mode";

const PAYMONGO_CHECKOUT_URL = "https://api.paymongo.com/v2/checkout_sessions";
const PAYMONGO_LEGACY_CHECKOUT_URL = "https://api.paymongo.com/v1/checkout_sessions";
const PAYMONGO_REFUND_URL = "https://api.paymongo.com/v1/refunds";

interface PayMongoErrorDocument {
  errors?: Array<{
    code?: unknown;
    detail?: unknown;
  }>;
}

export class PayMongoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PayMongoApiError";
  }
}

function getAuthorizationHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function readPayMongoError(response: Response) {
  try {
    const document = await response.json() as PayMongoErrorDocument;
    const firstError = document.errors?.[0];
    return {
      code: typeof firstError?.code === "string" ? firstError.code : undefined,
      detail: typeof firstError?.detail === "string"
        ? firstError.detail
        : "PayMongo rejected the checkout request.",
    };
  } catch {
    return { detail: "PayMongo rejected the checkout request." };
  }
}

export async function createPayMongoCheckoutSession(
  input: PayMongoCheckoutInput,
): Promise<PayMongoCheckoutSession> {
  const mode = getPayMongoMode();
  const secretKey = requirePayMongoSecretKey(mode);
  const response = await fetch(PAYMONGO_CHECKOUT_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: getAuthorizationHeader(secretKey),
      "Content-Type": "application/json",
      "Idempotency-Key": requirePayMongoIdempotencyKey(input.idempotencyKey),
    },
    body: JSON.stringify(buildPayMongoCheckoutPayload(input)),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const error = await readPayMongoError(response);
    throw new PayMongoApiError(error.detail, response.status, error.code);
  }

  return parsePayMongoCheckoutSession(await response.json(), mode);
}

export async function expirePayMongoCheckoutSession(checkoutId: string): Promise<void> {
  if (!/^cs_[A-Za-z0-9_-]+$/.test(checkoutId)) {
    throw new Error("A valid PayMongo checkout ID is required.");
  }

  const secretKey = requirePayMongoSecretKey();
  const response = await fetch(
    `${PAYMONGO_LEGACY_CHECKOUT_URL}/${encodeURIComponent(checkoutId)}/expire`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: getAuthorizationHeader(secretKey),
        "Content-Type": "application/json",
        "Idempotency-Key": requirePayMongoIdempotencyKey(`expire:${checkoutId}`),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    const error = await readPayMongoError(response);
    throw new PayMongoApiError(error.detail, response.status, error.code);
  }
}

export async function createPayMongoRefund(input: {
  refundId: string;
  paymentId: string;
  amountPhp: number;
  orderNumber: string;
}): Promise<PayMongoRefund> {
  const mode = getPayMongoMode();
  const secretKey = requirePayMongoSecretKey(mode);
  const response = await fetch(PAYMONGO_REFUND_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: getAuthorizationHeader(secretKey),
      "Content-Type": "application/json",
      "Idempotency-Key": requirePayMongoIdempotencyKey(`refund:${input.refundId}`),
    },
    body: JSON.stringify(buildPayMongoRefundPayload(input)),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const error = await readPayMongoError(response);
    throw new PayMongoApiError(error.detail, response.status, error.code);
  }
  return parsePayMongoRefund(await response.json(), mode);
}
