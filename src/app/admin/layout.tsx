import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireBusiness } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireBusiness("/admin");
  return children;
}
