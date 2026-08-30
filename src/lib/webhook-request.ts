export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export class WebhookBodyTooLargeError extends Error {
  constructor() {
    super("Webhook body exceeds the allowed size.");
    this.name = "WebhookBodyTooLargeError";
  }
}

export async function readWebhookBody(
  request: Request,
  maxBytes = MAX_WEBHOOK_BODY_BYTES,
) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new WebhookBodyTooLargeError();
    }
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > maxBytes) throw new WebhookBodyTooLargeError();
  return new TextDecoder().decode(body);
}
