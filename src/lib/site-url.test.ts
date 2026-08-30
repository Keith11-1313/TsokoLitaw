import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfiguredSiteOrigin, getTrustedRequestOrigin } from "./site-url";

describe("site URL validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("normalizes a configured HTTPS site URL to its origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.tsokolitaw.com/checkout");
    expect(getConfiguredSiteOrigin()).toBe("https://www.tsokolitaw.com");
  });

  it("allows HTTP only for a local site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000/path");
    expect(getConfiguredSiteOrigin()).toBe("http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://tsokolitaw.com");
    expect(() => getConfiguredSiteOrigin()).toThrow("must use HTTPS");
  });

  it("uses the configured origin instead of a forwarded request host in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.tsokolitaw.com");
    expect(getTrustedRequestOrigin(new URL("https://malicious.example/auth/callback")))
      .toBe("https://www.tsokolitaw.com");
  });
});
