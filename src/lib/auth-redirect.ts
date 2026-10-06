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

export function getRoleNextPath(role: "customer" | "admin", value: string) {
  const path = getSafeNextPath(value);
  const isAdminPath = /^\/admin(?:\/|\?|$)/.test(path);
  return role === "admin" ? (isAdminPath ? path : "/admin") : isAdminPath ? "/" : path;
}
