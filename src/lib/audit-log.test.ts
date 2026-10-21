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
  ).toBe("Role: admin → staff");
  expect(
    summarizeAuditChange("order.status_changed", {
      from_status: "CONFIRMED",
      to_status: "PREPARING",
    }),
  ).toBe("Order status: CONFIRMED → PREPARING");
});
it("never returns arbitrary metadata, paths, provider references or reasons", () => {
  const metadata = {
    receipt_path: "private/receipt.webp",
    secret: "credential",
    reason: "private details",
    provider_reference: "sensitive",
    quantity: 3,
  };
  expect(summarizeAuditChange("unknown.action", metadata)).toBe(
    "No additional details were recorded for display.",
  );
  expect(summarizeAuditChange("inventory.waste_recorded", metadata)).toBe(
    "Unusable pieces recorded: 3",
  );
  expect(
    summarizeAuditChange("account.role_changed", { previous_role: "secret", next_role: "staff" }),
  ).toBe("No additional details were recorded for display.");
});

it("shows only safe saved catalog and publication values", () => {
  expect(
    summarizeAuditChange("catalog.coating_updated", {
      name: "private free text",
      price_per_piece: 5,
      active: true,
      receipt_path: "private",
    }),
  ).toBe("Price per piece: ₱5.00\nAvailability: Active");
  expect(
    summarizeAuditChange("journal.updated", { status: "published", content: "not serialized" }),
  ).toBe("Post status: Published");
});

it("shows stock and currency transitions without claiming unchanged saves changed", () => {
  expect(summarizeAuditChange("inventory.updated", { previous_total: 0, stock_total: 100 })).toBe(
    "Prepared stock: 0 → 100 pieces",
  );
  expect(summarizeAuditChange("inventory.updated", { previous_total: 0, stock_total: 0 })).toBe(
    "Prepared stock unchanged: 0 pieces",
  );
  expect(
    summarizeAuditChange("catalog.variant_updated", {
      previous_price: 40.01,
      price: 40,
      active: false,
    }),
  ).toBe("Price: ₱40.01 → ₱40.00\nAvailability: Inactive");
  expect(summarizeAuditChange("catalog.variant_updated", { previous_price: 40, price: 40 })).toBe(
    "Price unchanged: ₱40.00",
  );
});

it("explains payments, moderation, ordering and saved operating times", () => {
  expect(summarizeAuditChange("manual_payment.approved", {})).toBe(
    "Manual GCash payment approved.",
  );
  expect(summarizeAuditChange("payment.counter_recorded", { amount: 40 })).toBe(
    "Counter payment recorded: ₱40.00",
  );
  expect(summarizeAuditChange("review.moderated", { visible: false, featured: false })).toBe(
    "Public review: Hidden\nCommunity highlight: Not featured",
  );
  expect(summarizeAuditChange("pickup.closed", { is_open: false })).toBe("Ordering: Closed");
  expect(
    summarizeAuditChange("pickup.settings_updated", {
      minimum_lead_days: 0,
      daily_cutoff_time: "17:00:00",
    }),
  ).toBe("Made-to-order lead time: 0 days\nDaily order cutoff: 5:00 PM (PH)");
});
