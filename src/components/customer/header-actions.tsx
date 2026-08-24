"use client";

import { ChevronDown, LogIn, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/cn";

export function HeaderActions({ mobile = false }: { mobile?: boolean }) {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div className={cn("flex items-center", mobile ? "w-full gap-3" : "gap-2")}>
    <div ref={rootRef} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus", mobile && "flex-1")}>
        <UserRound aria-hidden="true" size={18} /><span>Account</span><ChevronDown aria-hidden="true" size={14} />
      </button>
      {open ? <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-card border border-border bg-surface p-2 shadow-xl">
        <p className="px-3 py-2 text-xs text-muted-foreground">Account UI preview</p>
        <Link role="menuitem" href="/profile" className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><UserRound size={17} />Profile</Link>
        <Link role="menuitem" href="/orders" className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><ShoppingBag size={17} />My Orders</Link>
        <Link role="menuitem" href="/login" className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><LogIn size={17} />Sign in</Link>
      </div> : null}
    </div>
    <Link href="/cart" aria-label={`View cart with ${itemCount} items`} className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
      <ShoppingBag aria-hidden="true" size={19} />
      {itemCount > 0 ? <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-surface">{itemCount}</span> : null}
    </Link>
  </div>;
}
