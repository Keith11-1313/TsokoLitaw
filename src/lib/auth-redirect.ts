export function getSafeNextPath(value: string | null | undefined, fallback = "/") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  return value;
}

export function getRoleNextPath(role: "customer" | "staff" | "admin", value: string) {
  const path = getSafeNextPath(value);
  const isAdminPath = /^\/admin(?:\/|\?|$)/.test(path);
  if (role === "staff") return /^\/admin(?:\/orders)?(?:\?|$)/.test(path) ? path : "/admin";
  return role === "admin" ? (isAdminPath ? path : "/admin") : isAdminPath ? "/" : path;
}
