import { afterEach, describe, expect, it, vi } from "vitest";
import { getPayMongoMode, requirePayMongoSecretKey } from "./paymongo-mode";

describe("PayMongo environment mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults safely to test mode", () => {
    vi.stubEnv("PAYMONGO_MODE", "");
    expect(getPayMongoMode()).toBe("test");
  });

  it("requires the secret-key prefix to match the selected mode", () => {
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_example");
    expect(requirePayMongoSecretKey("test")).toBe("sk_test_example");
    expect(() => requirePayMongoSecretKey("live")).toThrow("PAYMONGO_MODE=live");

    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_live_example");
    expect(requirePayMongoSecretKey("live")).toBe("sk_live_example");
    expect(() => requirePayMongoSecretKey("test")).toThrow("PAYMONGO_MODE=test");
  });

  it("rejects an invalid mode instead of guessing", () => {
    vi.stubEnv("PAYMONGO_MODE", "production");
    expect(() => getPayMongoMode()).toThrow("either test or live");
  });
});
