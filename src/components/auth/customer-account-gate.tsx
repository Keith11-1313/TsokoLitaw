import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth";

export async function CustomerAccountGate({ children, nextPath }: { children: ReactNode; nextPath: string }) {
  const profile = await requireCustomer(nextPath);
  if (nextPath === "/checkout" && profile.deletionScheduledFor) redirect("/profile");
  return children;
}
