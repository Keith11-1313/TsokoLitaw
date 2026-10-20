export type AccountRole = "customer" | "staff" | "admin";
export function isBusinessRole(role: AccountRole | undefined) {
  return role === "admin" || role === "staff";
}
