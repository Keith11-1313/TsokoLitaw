// PostgREST emits bigint IDs as JSON numbers. Keep the existing string-based URL,
// form and DTO contract at this one transport boundary; counts/prices stay numbers.
// Auth and Storage responses are deliberately not transformed.
const scalarIdFunctions = new Set([
  "upsert_catalog_addon",
  "upsert_catalog_coating",
  "upsert_daily_inventory",
  "upsert_journal_post",
  "upsert_pickup_location",
  "upsert_pickup_schedule",
  "submit_order_review",
]);

export function isEntityIdKey(key: string) {
  return key === "id" || key.endsWith("_id") || key.endsWith("_ids");
}

export function stringifyEntityIds(value: unknown, key = ""): unknown {
  if (typeof value === "number" && isEntityIdKey(key)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid database identifier.");
    return String(value);
  }
  if (Array.isArray(value)) return value.map((entry) => stringifyEntityIds(entry, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => [name, stringifyEntityIds(entry, name)]),
    );
  }
  return value;
}

export const entityIdFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );
  if (
    !url.pathname.startsWith("/rest/v1/") ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    return response;
  const body = await response.text();
  if (!body)
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  const value: unknown = JSON.parse(body);
  const key =
    scalarIdFunctions.has(url.pathname.split("/").at(-1) ?? "") && response.ok ? "id" : "";
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(JSON.stringify(stringifyEntityIds(value, key)), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
