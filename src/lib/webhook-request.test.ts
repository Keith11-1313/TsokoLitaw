import { describe, expect, it, vi } from "vitest";
import { readWebhookBody, WebhookBodyTooLargeError } from "./webhook-request";

describe("webhook request body limits", () => {
  it("preserves split UTF-8 text and accepts the exact byte limit", async () => {
    const bytes = new TextEncoder().encode('{"value":"₱"}');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const request = new Request("https://example.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readWebhookBody(request, bytes.length)).resolves.toBe('{"value":"₱"}');
  });

  it("cancels a chunked body at the limit without draining it", async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(new Uint8Array(32));
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "1" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readWebhookBody(request, 64)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
    expect(cancel).toHaveBeenCalledOnce();
    expect(pulls).toBe(3);
  });

  it("accepts an empty body", async () => {
    await expect(readWebhookBody(new Request("https://example.test"))).resolves.toBe("");
  });

  it("returns a body within the configured byte limit", async () => {
    const request = new Request("https://www.tsokolitaw.com/api/webhooks/test", {
      method: "POST",
      body: "signed payload",
    });
    await expect(readWebhookBody(request, 64)).resolves.toBe("signed payload");
  });

  it("rejects an oversized declared content length before reading", async () => {
    const request = new Request("https://www.tsokolitaw.com/api/webhooks/test", {
      method: "POST",
      headers: { "content-length": "65" },
      body: "small",
    });
    await expect(readWebhookBody(request, 64)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
  });

  it("rejects an oversized actual body when content length is absent", async () => {
    const request = new Request("https://www.tsokolitaw.com/api/webhooks/test", {
      method: "POST",
      body: "x".repeat(65),
    });
    request.headers.delete("content-length");
    await expect(readWebhookBody(request, 64)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
  });
});
