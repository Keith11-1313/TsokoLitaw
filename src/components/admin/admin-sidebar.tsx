import {
  Cookie,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { cn } from "@/lib/cn";

interface AdminNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const adminNavigation: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Cookie },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminSidebarProps {
  activePath?: string;
  adminName?: string;
  adminEmail?: string;
  className?: string;
}

export function AdminSidebar({
  activePath,
  adminName = "Administrator",
  adminEmail = "Admin email to be configured",
  className,
}: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        "flex min-h-screen w-[17.5rem] shrink-0 flex-col border-r border-border bg-surface px-8 py-8",
        className,
      )}
    >
      <Link
        href="/admin"
        aria-label="TsokoLitaw admin dashboard"
        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <BrandLockup context="admin" />
      </Link>

      <nav className="mt-10 space-y-2" aria-label="Admin navigation">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-control px-4 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                isActive && "bg-surface-muted font-bold text-brand",
              )}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
              {isActive ? (
                <span
                  className="absolute right-4 h-5 w-1 rounded-full bg-brand"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-brand"
            aria-hidden="true"
          >
            AD
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{adminName}</p>
            <p className="truncate text-xs text-muted-foreground">{adminEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
