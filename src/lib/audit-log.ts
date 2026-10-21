import type { Json } from "@/types/database.generated";
import { formatPhp } from "@/lib/commerce";

export const auditAreas = [
  "account",
  "order",
  "payment",
  "inventory",
  "catalog",
  "pickup",
  "journal",
  "review",
] as const;
export type AuditFilters = {
  q: string;
  area: string;
  from: string;
  to: string;
  page: number;
  size: number;
};
function day(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  if (value.slice(0, 4) < "1900" || value.slice(0, 4) > "2100") return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : "";
}
export function normalizeAuditFilters(input: Record<string, unknown>): AuditFilters {
  const size = Number(input.size);
  const from = day(input.from),
    to = day(input.to);
  return {
    q: typeof input.q === "string" ? input.q.trim().slice(0, 100) : "",
    area:
      typeof input.area === "string" && auditAreas.some((area) => area === input.area)
        ? input.area
        : "",
    from,
    to,
    page: Math.min(1000000, Math.max(1, Math.trunc(Number(input.page)) || 1)),
    size: [10, 20, 50, 100].includes(size) ? size : 20,
  };
}
export function auditDayAfter(value: string) {
  return new Date(new Date(`${value}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
}
export function auditHref(filters: AuditFilters) {
  const query = new URLSearchParams({ size: String(filters.size) });
  for (const key of ["q", "area", "from", "to"] as const)
    if (filters[key]) query.set(key, filters[key]);
  if (filters.page > 1) query.set("page", String(filters.page));
  return `/admin/audit?${query}`;
}
export function auditActionLabel(value: string) {
  return value.replaceAll("_", " ").replace(".", " · ").slice(0, 100);
}
// Only known, bounded operational values. Never serialize arbitrary metadata,
// receipt paths, free-text reasons, credentials or provider references.
export function summarizeAuditChange(action: string, metadata: Json): string {
  const unavailable = "No additional details were recorded for display.";
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return unavailable;
  const roles = ["customer", "staff", "admin"];
  if (
    action === "account.role_changed" &&
    typeof metadata.previous_role === "string" &&
    typeof metadata.next_role === "string" &&
    roles.includes(metadata.previous_role) &&
    roles.includes(metadata.next_role)
  )
    return `Role: ${metadata.previous_role} → ${metadata.next_role}`;
  const states = [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
  ];
  if (
    typeof metadata.from_status === "string" &&
    typeof metadata.to_status === "string" &&
    states.includes(metadata.from_status) &&
    states.includes(metadata.to_status)
  )
    return `Order status: ${metadata.from_status.replaceAll("_", " ")} → ${metadata.to_status.replaceAll("_", " ")}`;
  if (action.startsWith("inventory.")) {
    const lines: string[] = [];
    const number = (key: string) =>
      typeof metadata[key] === "number" && Number.isFinite(metadata[key])
        ? (metadata[key] as number)
        : undefined;
    const total = number("stock_total"),
      previous = number("previous_total");
    if (total !== undefined)
      lines.push(
        previous === total
          ? `Prepared stock unchanged: ${total} pieces`
          : `Prepared stock: ${previous === undefined ? "" : `${previous} → `}${total} pieces`,
      );
    const quantity = number("quantity"),
      remaining = number("remaining_pieces");
    if (quantity !== undefined) lines.push(`Unusable pieces recorded: ${quantity}`);
    if (remaining !== undefined)
      lines.push(`Available stock after adjustment: ${remaining} pieces`);
    if (day(metadata.pickup_date)) lines.push(`Pickup date: ${metadata.pickup_date}`);
    if (lines.length) return lines.join("\n");
  }
  if (action === "manual_payment.approved") return "Manual GCash payment approved.";
  if (action === "manual_payment.rejected") return "Manual GCash payment rejected.";
  if (action === "payment.counter_recorded")
    return typeof metadata.amount === "number" && Number.isFinite(metadata.amount)
      ? `Counter payment recorded: ${formatPhp(metadata.amount)}`
      : "Counter payment recorded.";
  if (action === "order.admin_cancelled") return "Order cancelled.";
  const fields = Object.entries(metadata).flatMap(([key, value]) => {
    if (
      ["price", "price_per_piece", "minimum_lead_days"].includes(key) &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      if (key === "minimum_lead_days")
        return [`Made-to-order lead time: ${value} ${value === 1 ? "day" : "days"}`];
      const label = key === "price_per_piece" ? "Price per piece" : "Price";
      const previous = metadata.previous_price;
      return [
        typeof previous === "number" && Number.isFinite(previous)
          ? previous === value
            ? `${label} unchanged: ${formatPhp(value)}`
            : `${label}: ${formatPhp(previous)} → ${formatPhp(value)}`
          : `${label}: ${formatPhp(value)}`,
      ];
    }
    if (
      [
        "active",
        "default",
        "is_active",
        "is_visible",
        "is_featured",
        "is_open",
        "visible",
        "featured",
      ].includes(key) &&
      typeof value === "boolean"
    ) {
      if (key === "is_open") return [`Ordering: ${value ? "Open" : "Closed"}`];
      if (["visible", "is_visible"].includes(key))
        return [`Public review: ${value ? "Visible" : "Hidden"}`];
      if (["featured", "is_featured"].includes(key))
        return [`Community highlight: ${value ? "Featured" : "Not featured"}`];
      if (key === "default") return [`Default choice: ${value ? "Yes" : "No"}`];
      return [`Availability: ${value ? "Active" : "Inactive"}`];
    }
    if (
      ["daily_cutoff_time", "operating_start", "operating_end"].includes(key) &&
      typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
    ) {
      const hour = Number(value.slice(0, 2));
      const label = {
        daily_cutoff_time: "Daily order cutoff",
        operating_start: "Operating start",
        operating_end: "Operating end",
      }[key];
      return [`${label}: ${hour % 12 || 12}:${value.slice(3, 5)} ${hour < 12 ? "AM" : "PM"} (PH)`];
    }
    if (key === "pickup_date" && day(value)) return [`Pickup date: ${value}`];
    if (key === "status" && typeof value === "string" && ["draft", "published"].includes(value))
      return [`Post status: ${value === "draft" ? "Draft" : "Published"}`];
    return [];
  });
  if (fields.length) return fields.join("\n");
  return unavailable;
}
