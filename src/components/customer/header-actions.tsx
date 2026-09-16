"use client";

import { ChevronDown, LayoutDashboard, ShoppingBag, UserRound } from "lucide-react";
import { CustomerNavigationLink as Link } from "@/components/customer/customer-navigation-link";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/cn";

export function HeaderActions({
  mobile = false,
  isSignedIn = false,
  isAdmin = false,
}: {
  mobile?: boolean;
  isSignedIn?: boolean;
  isAdmin?: boolean;
}) {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeWithKeyboard);
    };
  }, [open]);

  useEffect(() => {
    if (!mobile) return;
    const parentMenu = rootRef.current?.closest("details");
    if (!parentMenu) return;

    const closeWithParent = () => {
      if (!parentMenu.open) setOpen(false);
    };
    parentMenu.addEventListener("toggle", closeWithParent);
    return () => parentMenu.removeEventListener("toggle", closeWithParent);
  }, [mobile]);

  if (mobile) {
    return (
      <div ref={rootRef} className="w-full">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          {isSignedIn ? (
            <AccountButton
              ref={triggerRef}
              controls={menuId}
              open={open}
              onClick={() => setOpen((current) => !current)}
              className="w-full"
            />
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <UserRound aria-hidden="true" size={18} />
              Account
            </Link>
          )}
          <CartAction itemCount={itemCount} />
        </div>
        {isSignedIn && open ? <AccountMenu id={menuId} isAdmin={isAdmin} mobile /> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isSignedIn ? (
        <div ref={rootRef} className="relative">
          <AccountButton
            ref={triggerRef}
            controls={menuId}
            open={open}
            onClick={() => setOpen((current) => !current)}
          />
          {open ? <AccountMenu id={menuId} isAdmin={isAdmin} /> : null}
        </div>
      ) : (
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <UserRound aria-hidden="true" size={18} />
          Account
        </Link>
      )}
      <CartAction itemCount={itemCount} />
    </div>
  );
}

function AccountButton({
  ref,
  controls,
  open,
  onClick,
  className,
}: {
  ref: Ref<HTMLButtonElement>;
  controls: string;
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-controls={controls}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        className,
      )}
    >
      <UserRound aria-hidden="true" size={18} />
      <span>Account</span>
      <ChevronDown
        aria-hidden="true"
        size={14}
        className={cn("transition-transform", open && "rotate-180")}
      />
    </button>
  );
}

function AccountMenu({
  id,
  isAdmin,
  mobile = false,
}: {
  id: string;
  isAdmin: boolean;
  mobile?: boolean;
}) {
  return (
    <div
      id={id}
      role="menu"
      className={cn(
        mobile
          ? "mt-3 border-t border-border pt-3"
          : "absolute right-0 top-12 z-50 w-56 rounded-card border border-border bg-surface p-2 shadow-xl",
      )}
    >
      {isAdmin ? (
        <Link
          role="menuitem"
          href="/admin"
          className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-bold text-brand hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <LayoutDashboard aria-hidden="true" size={17} />
          Admin dashboard
        </Link>
      ) : null}
      <Link
        role="menuitem"
        href="/profile"
        className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <UserRound aria-hidden="true" size={17} />
        Profile
      </Link>
      <Link
        role="menuitem"
        href="/orders"
        className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ShoppingBag aria-hidden="true" size={17} />
        My Orders
      </Link>
      <LogoutButton
        menuItem
        iconSize={17}
        className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
    </div>
  );
}

function CartAction({ itemCount }: { itemCount: number }) {
  return (
    <Link
      href="/cart"
      aria-label={`View cart with ${itemCount} items`}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <ShoppingBag aria-hidden="true" size={19} />
      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-surface">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
