"use client";

import { BadgePercent, CalendarDays, Cookie, LayoutDashboard, Menu, MessageSquare, Newspaper, Package, Settings, ShoppingBag, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { cn } from "@/lib/cn";
import { LogoutButton } from "@/components/auth/logout-button";

interface AdminNavigationItem { href: string; label: string; icon: LucideIcon }
const adminNavigation: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard }, { href: "/admin/orders", label: "Orders", icon: ShoppingBag }, { href: "/admin/products", label: "Catalog", icon: Cookie }, { href: "/admin/inventory", label: "Inventory", icon: Package }, { href: "/admin/pickup", label: "Pickup", icon: CalendarDays }, { href: "/admin/promotions", label: "Promotions", icon: BadgePercent }, { href: "/admin/customers", label: "Customers", icon: Users }, { href: "/admin/reviews", label: "Reviews", icon: MessageSquare }, { href: "/admin/journal", label: "Journal", icon: Newspaper }, { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ activePath, adminName = "Administrator", adminEmail = "Admin email to be configured", className }: { activePath?: string; adminName?: string; adminEmail?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const menuButton = menuButtonRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (drawerRef.current?.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); menuButton?.focus(); };
  }, [open]);
  const navigation = <nav className="mt-6 space-y-1" aria-label="Admin navigation">{adminNavigation.map((item) => { const Icon = item.icon; const active = activePath === item.href; return <Link onClick={() => setOpen(false)} key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-11 items-center gap-3 rounded-control px-4 text-sm text-muted-foreground hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus", active && "bg-surface-muted font-bold text-brand")}><Icon size={18} /><span>{item.label}</span>{active ? <span className="absolute right-4 h-5 w-1 rounded-full bg-brand" /> : null}</Link>; })}</nav>;
  return <>
    <header className="flex min-h-20 items-center justify-between border-b border-border bg-surface px-4 lg:hidden"><Link href="/admin" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><BrandLockup context="admin" /></Link><button ref={menuButtonRef} type="button" aria-label="Open admin menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex size-11 items-center justify-center rounded-full bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><Menu aria-hidden="true" size={20} /></button></header>
    {open ? <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)}><aside ref={drawerRef} aria-label="Admin menu" className="flex h-full w-[min(20rem,86vw)] flex-col overflow-y-auto bg-surface p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><BrandLockup context="admin" /><button type="button" aria-label="Close admin menu" autoFocus onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" size={20} /></button></div>{navigation}<div className="mt-auto border-t border-border pt-5"><p className="text-sm font-bold">{adminName}</p><p className="truncate text-xs text-muted-foreground">{adminEmail}</p><LogoutButton className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-control text-left text-sm text-muted-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" /></div></aside></div> : null}
    <aside className={cn("sticky top-0 hidden h-screen w-[17.5rem] shrink-0 flex-col border-r border-border bg-surface px-8 py-8 lg:flex", className)}><Link href="/admin"><BrandLockup context="admin" /></Link>{navigation}<div className="mt-auto border-t border-border pt-6"><p className="text-sm font-bold">{adminName}</p><p className="truncate text-xs text-muted-foreground">{adminEmail}</p><LogoutButton className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-control text-left text-sm text-muted-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" /></div></aside>
  </>;
}
