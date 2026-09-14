import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/notification-email", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/site-url", () => ({ getConfiguredSiteOrigin: vi.fn() }));

let sendWithResend: typeof import("./server-notifications").sendWithResend;

const email = {
  apiKey: "re_test",
  from: "TsokoLitaw <orders@updates.tsokolitaw.com>",
  to: "customer@example.com",
  idempotencyKey: "order.confirmed:123",
  subject: "Order confirmed",
  html: "<p>Confirmed</p>",
  text: "Confirmed",
};

beforeAll(async () => {
  ({ sendWithResend } = await import("./server-notifications"));
});

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("sendWithResend", () => {
  it("sends an explicit user agent and returns the provider message ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendWithResend(email)).resolves.toBe("email_123");

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({
      Authorization: "Bearer re_test",
      "Idempotency-Key": "order.confirmed:123",
      "User-Agent": "TsokoLitaw/0.1",
    });
  });

  it("keeps the safe provider error type and message for diagnosis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            name: "validation_error",
            message: "The sender domain is not verified.\nPlease verify it.",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(sendWithResend(email)).rejects.toThrow(
      "Resend rejected the message with status 403 (validation_error: The sender domain is not verified. Please verify it.).",
    );
  });

  it("does not persist an arbitrary non-JSON provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>Access denied</html>", { status: 403 })),
    );

    await expect(sendWithResend(email)).rejects.toThrow(
      "Resend rejected the message with status 403.",
    );
  });
});
