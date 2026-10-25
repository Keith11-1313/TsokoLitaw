const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

// Database bigint identities are bounded to the exact JavaScript integer range.
// Domain/URL IDs remain canonical decimal strings, not lossy JS bigint JSON values.
export function isEntityId(value: string) {
  return (
    typeof value === "string" &&
    /^[1-9]\d{0,15}$/.test(value) &&
    Number.isSafeInteger(Number(value))
  );
}
