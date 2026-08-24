import type { LucideIcon } from "lucide-react";

export interface OrderReminder {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface OrderReminderCardProps {
  reminder: OrderReminder;
}

export function OrderReminderCard({ reminder }: OrderReminderCardProps) {
  const Icon = reminder.icon;

  return (
    <article className="grid gap-3 rounded-card border border-border bg-surface px-5 py-5 sm:grid-cols-[auto_auto_1fr] sm:items-start sm:gap-4 lg:min-h-[6.875rem] lg:px-6 lg:py-6">
      <Icon
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-brand"
        size={23}
        strokeWidth={1.8}
      />
      <h2 className="font-display text-xl leading-6 text-foreground">
        {reminder.title}
      </h2>
      <p className="text-sm leading-5 text-muted-foreground">
        {reminder.description}
      </p>
    </article>
  );
}
