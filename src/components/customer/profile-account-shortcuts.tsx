"use client";

import { LogOut, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthPreview } from "@/components/auth/auth-preview-provider";

export function ProfileAccountShortcuts() {
  const router = useRouter();
  const { signOut } = useAuthPreview();

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="font-display text-xl">Account shortcuts</h2>
      <div className="mt-3 space-y-1">
        <Link href="/orders" className="flex min-h-11 items-center gap-2 rounded-control px-2 hover:bg-surface-muted"><ShoppingBag aria-hidden="true" size={16} />My orders</Link>
        <button type="button" onClick={() => { signOut(); router.replace("/login"); }} className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><LogOut aria-hidden="true" size={16} />Log out</button>
      </div>
    </section>
  );
}
