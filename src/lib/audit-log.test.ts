import { expect, it } from "vitest";
import { normalizeAuditFilters, auditDayAfter, auditHref, summarizeAuditChange } from "./audit-log";
it("bounds pagination and rejects unknown actions and invalid dates", () => {
  expect(
    normalizeAuditFilters({
      q: "  Alex  ",
      page: -3,
      size: 500,
      area: "injection",
      from: "2026-02-30",
      to: "9999-12-31",
    }),
  ).toEqual({ q: "Alex", page: 1, size: 20, area: "", from: "", to: "" });
  expect(normalizeAuditFilters({ page: Infinity, size: 100 }).page).toBe(1000000);
});
it("retains all filters in pagination URLs and computes an exclusive end date", () => {
  const filters = normalizeAuditFilters({
    q: "A & B",
    area: "account",
    from: "2026-10-01",
    to: "2026-10-21",
    size: 50,
    page: 2,
  });
  expect(auditHref(filters)).toContain("q=A+%26+B");
  expect(auditHref(filters)).toContain("page=2");
  expect(auditDayAfter("2026-12-31")).toBe("2027-01-01");
});
it("summarizes roles and actual stored fulfillment status fields", () => {
  expect(
    summarizeAuditChange("account.role_changed", { previous_role: "admin", next_role: "staff" }),
  ).toBe("admin → staff");
  expect(
    summarizeAuditChange("order.status_changed", {
      from_status: "CONFIRMED",
      to_status: "PREPARING",
    }),
  ).toBe("CONFIRMED → PREPARING");
});
it("never returns arbitrary metadata, paths, provider references or reasons", () => {
  const metadata = {
    receipt_path: "private/receipt.webp",
    secret: "credential",
    reason: "private details",
    provider_reference: "sensitive",
    quantity: 3,
  };
  expect(summarizeAuditChange("unknown.action", metadata)).toBe("Recorded event");
  expect(summarizeAuditChange("inventory.waste_recorded", metadata)).toBe("quantity: 3");
  expect(
    summarizeAuditChange("account.role_changed", { previous_role: "secret", next_role: "staff" }),
  ).toBe("Recorded event");
});

it("shows only safe saved catalog and publication values", () => {
  expect(
    summarizeAuditChange("catalog.coating_updated", {
      name: "private free text",
      price_per_piece: 5,
      active: true,
      receipt_path: "private",
    }),
  ).toBe("price per piece: 5 · active: yes");
  expect(
    summarizeAuditChange("journal.updated", { status: "published", content: "not serialized" }),
  ).toBe("status: published");
});
