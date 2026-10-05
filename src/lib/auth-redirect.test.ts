import { describe, expect, it } from "vitest";
import { getRoleNextPath, getSafeNextPath } from "./auth-redirect";

describe("authentication redirect safety", () => {
  it("keeps Admins in Admin and customer destinations outside Admin", () => {
    expect(getRoleNextPath("admin", "/checkout")).toBe("/admin");
    expect(getRoleNextPath("admin", "/profile")).toBe("/admin");
    expect(getRoleNextPath("admin", "/admin/orders")).toBe("/admin/orders");
    expect(getRoleNextPath("customer", "/checkout")).toBe("/checkout");
    expect(getRoleNextPath("customer", "/admin/customers")).toBe("/");
    expect(getRoleNextPath("admin", "//malicious.example")).toBe("/admin");
  });
  it("keeps valid application-relative destinations", () => {
    expect(getSafeNextPath("/checkout")).toBe("/checkout");
    expect(getSafeNextPath("/orders/TL-1001/review")).toBe("/orders/TL-1001/review");
  });

  it("rejects absolute and protocol-relative redirect targets", () => {
    expect(getSafeNextPath("https://malicious.example", "/profile")).toBe("/profile");
    expect(getSafeNextPath("//malicious.example", "/profile")).toBe("/profile");
    expect(getSafeNextPath(null, "/profile")).toBe("/profile");
  });

  it("rejects browser-normalized and control-character redirect targets", () => {
    expect(getSafeNextPath("/\\malicious.example", "/profile")).toBe("/profile");
    expect(getSafeNextPath("/orders\r\nLocation: https://malicious.example", "/profile")).toBe(
      "/profile",
    );
  });
});
