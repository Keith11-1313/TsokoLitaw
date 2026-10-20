import type { Json } from "@/types/database.generated";

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
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "Recorded event";
  const roles = ["customer", "staff", "admin"];
  if (
    action === "account.role_changed" &&
    typeof metadata.previous_role === "string" &&
    typeof metadata.next_role === "string" &&
    roles.includes(metadata.previous_role) &&
    roles.includes(metadata.next_role)
  )
    return `${metadata.previous_role} → ${metadata.next_role}`;
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
    return `${metadata.from_status.replaceAll("_", " ")} → ${metadata.to_status.replaceAll("_", " ")}`;
  if (action.startsWith("inventory.")) {
    const pairs = Object.entries(metadata).filter(
      ([key, value]) =>
        [
          "quantity",
          "stock_total",
          "previous_total",
          "remaining_pieces",
          "inventory_delta",
        ].includes(key) &&
        typeof value === "number" &&
        Number.isFinite(value),
    );
    if (pairs.length)
      return pairs.map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(" · ");
  }
  const fields = Object.entries(metadata).flatMap(([key, value]) => {
    if (
      ["previous_price", "price", "price_per_piece", "minimum_lead_days"].includes(key) &&
      typeof value === "number" &&
      Number.isFinite(value)
    )
      return [`${key.replaceAll("_", " ")}: ${value}`];
    if (
      [
        "active",
        "default",
        "is_active",
        "is_visible",
        "is_featured",
        "previous_open",
        "is_open",
      ].includes(key) &&
      typeof value === "boolean"
    )
      return [`${key.replaceAll("_", " ")}: ${value ? "yes" : "no"}`];
    if (key === "status" && typeof value === "string" && ["draft", "published"].includes(value))
      return [`status: ${value}`];
    return [];
  });
  if (fields.length) return fields.join(" · ");
  return "Recorded event";
}
