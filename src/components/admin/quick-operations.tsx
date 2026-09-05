import { CalendarPlus, ClipboardList, PlusCircle } from "lucide-react";
import Link from "next/link";

const operations = [
  {
    title: "Manage Catalog",
    description: "Boxes, coatings, add-ons, images, and prices",
    icon: PlusCircle,
    href: "/admin/products",
  },
  {
    title: "View All Orders",
    description: "Review campus pickup and fulfillment state",
    icon: ClipboardList,
    href: "/admin/orders",
  },
  {
    title: "Publish Pickup Date",
    description: "Add a date, time window, and campus location",
    icon: CalendarPlus,
    href: "/admin/pickup",
  },
] as const;

export function QuickOperations() {
  return (
    <section aria-labelledby="quick-operations-heading">
      <h2 id="quick-operations-heading" className="font-display text-2xl">
        Quick operations
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {operations.map((operation) => {
          const Icon = operation.icon;
          return operation.href ? (
            <Link
              key={operation.title}
              href={operation.href}
              className="flex min-h-20 items-center gap-3 rounded-card border border-border bg-surface px-5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand">
                <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-sm font-bold text-foreground">
                  {operation.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {operation.description}
                </span>
              </span>
            </Link>
          ) : null;
        })}
      </div>
    </section>
  );
}
