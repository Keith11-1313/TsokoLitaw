export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export class WebhookBodyTooLargeError extends Error {
  constructor() {
    super("Webhook body exceeds the allowed size.");
    this.name = "WebhookBodyTooLargeError";
  }
}

export async function readWebhookBody(request: Request, maxBytes = MAX_WEBHOOK_BODY_BYTES) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new WebhookBodyTooLargeError();
    }
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        // Stop consuming an undeclared/chunked oversized body before buffering it.
        await reader.cancel().catch(() => undefined);
        throw new WebhookBodyTooLargeError();
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
