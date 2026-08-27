import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "./auth-redirect";

describe("authentication redirect safety", () => {
  it("keeps valid application-relative destinations", () => {
    expect(getSafeNextPath("/checkout")).toBe("/checkout");
    expect(getSafeNextPath("/orders/TL-1001/review")).toBe("/orders/TL-1001/review");
  });

  it("rejects absolute and protocol-relative redirect targets", () => {
    expect(getSafeNextPath("https://malicious.example", "/profile")).toBe("/profile");
    expect(getSafeNextPath("//malicious.example", "/profile")).toBe("/profile");
    expect(getSafeNextPath(null, "/profile")).toBe("/profile");
  });
});
