import { LayoutDashboard, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";

export function ProfileAccountShortcuts({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="font-display text-xl">Account shortcuts</h2>
      <div className="mt-3 space-y-1">
        {isAdmin ? <Link href="/admin" className="flex min-h-11 items-center gap-2 rounded-control px-2 font-bold hover:bg-surface-muted"><LayoutDashboard aria-hidden="true" size={16} />Admin dashboard</Link> : null}
        <Link href="/orders" className="flex min-h-11 items-center gap-2 rounded-control px-2 hover:bg-surface-muted"><ShoppingBag aria-hidden="true" size={16} />My orders</Link>
        <LogoutButton className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" />
      </div>
    </section>
  );
}
