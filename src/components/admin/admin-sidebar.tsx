"use client";

import { CalendarDays, Cookie, Home, LayoutDashboard, Menu, Newspaper, Package, PanelLeftClose, PanelLeftOpen, ShoppingBag, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { cn } from "@/lib/cn";
import { LogoutButton } from "@/components/auth/logout-button";

interface AdminNavigationItem { href: string; label: string; icon: LucideIcon }
const adminNavigation: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard }, { href: "/admin/orders", label: "Orders", icon: ShoppingBag }, { href: "/admin/products", label: "Catalog", icon: Cookie }, { href: "/admin/inventory", label: "Inventory", icon: Package }, { href: "/admin/pickup", label: "Pickup", icon: CalendarDays }, { href: "/admin/customers", label: "Customers", icon: Users }, { href: "/admin/journal", label: "Journal & Reviews", icon: Newspaper },
];

export function AdminSidebar({ activePath, adminName = "Administrator", adminEmail = "Admin email to be configured", className }: { activePath?: string; adminName?: string; adminEmail?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
  const navigation = <nav className="mt-6 space-y-1" aria-label="Admin navigation">{adminNavigation.map((item) => { const Icon = item.icon; const active = activePath === item.href; return <Link title={collapsed ? item.label : undefined} onClick={() => setOpen(false)} key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-11 items-center gap-3 rounded-control px-4 text-sm text-muted-foreground hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus", collapsed && "justify-center px-2", active && "bg-surface-muted font-bold text-brand")}><Icon size={18} /><span className={cn(collapsed && "sr-only")}>{item.label}</span>{active ? <span className={cn("absolute right-4 h-5 w-1 rounded-full bg-brand", collapsed && "right-1")} /> : null}</Link>; })}</nav>;
  return <>
    <header className="flex min-h-20 items-center justify-between border-b border-border bg-surface px-4 lg:hidden"><Link href="/admin" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><BrandLockup context="admin" /></Link><button ref={menuButtonRef} type="button" aria-label="Open admin menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex size-11 items-center justify-center rounded-full bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><Menu aria-hidden="true" size={20} /></button></header>
    {open ? <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)}><aside ref={drawerRef} aria-label="Admin menu" className="flex h-full w-[min(20rem,86vw)] flex-col overflow-y-auto bg-surface p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><BrandLockup context="admin" /><button type="button" aria-label="Close admin menu" autoFocus onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" size={20} /></button></div>{navigation}<div className="mt-auto border-t border-border pt-5"><Link href="/" className="flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-brand"><Home size={17} />Back to main page</Link><p className="mt-3 text-sm font-bold">{adminName}</p><p className="truncate text-xs text-muted-foreground">{adminEmail}</p><LogoutButton className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-control text-left text-sm text-muted-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" /></div></aside></div> : null}
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface py-8 transition-[width,padding] lg:flex", collapsed ? "w-24 px-4" : "w-[17.5rem] px-8", className)}><div className={cn("flex items-center gap-3", collapsed ? "flex-col" : "justify-between")}><Link href="/admin" aria-label="Admin dashboard"><BrandLockup context="admin" showSubtitle={!collapsed} titleClassName={collapsed ? "hidden" : undefined} /></Link><button type="button" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>{navigation}<div className="mt-auto border-t border-border pt-6"><Link title={collapsed ? "Back to main page" : undefined} href="/" className={cn("flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-brand", collapsed && "justify-center")}><Home size={17} /><span className={cn(collapsed && "sr-only")}>Back to main page</span></Link>{!collapsed ? <><p className="mt-3 text-sm font-bold">{adminName}</p><p className="truncate text-xs text-muted-foreground">{adminEmail}</p></> : null}<LogoutButton className={cn("mt-3 flex min-h-11 w-full items-center gap-2 rounded-control text-left text-sm text-muted-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus", collapsed && "justify-center [&_span]:sr-only")} /></div></aside>
  </>;
}
