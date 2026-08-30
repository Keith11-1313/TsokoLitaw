import { describe, expect, it } from "vitest";
import {
  readWebhookBody,
  WebhookBodyTooLargeError,
} from "./webhook-request";

describe("webhook request body limits", () => {
  it("returns a body within the configured byte limit", async () => {
    const request = new Request("https://tsokolitaw.com/api/webhooks/test", {
      method: "POST",
      body: "signed payload",
    });
    await expect(readWebhookBody(request, 64)).resolves.toBe("signed payload");
  });

  it("rejects an oversized declared content length before reading", async () => {
    const request = new Request("https://tsokolitaw.com/api/webhooks/test", {
      method: "POST",
      headers: { "content-length": "65" },
      body: "small",
    });
    await expect(readWebhookBody(request, 64)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
  });

  it("rejects an oversized actual body when content length is absent", async () => {
    const request = new Request("https://tsokolitaw.com/api/webhooks/test", {
      method: "POST",
      body: "x".repeat(65),
    });
    request.headers.delete("content-length");
    await expect(readWebhookBody(request, 64)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
  });
});
