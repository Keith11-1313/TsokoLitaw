import { CircleHelp, Link2Off, Store } from "lucide-react";

interface AdminScopeNoteProps {
  purpose: string;
  customerImpact: string;
}

export function AdminScopeNote({ purpose, customerImpact }: AdminScopeNoteProps) {
  const items = [
    { label: "Purpose", value: purpose, icon: CircleHelp },
    { label: "Customer impact", value: customerImpact, icon: Store },
    { label: "Current connection", value: "Mock UI only. Changes are not saved or shown to customers yet.", icon: Link2Off },
  ] as const;

  return (
    <section className="grid gap-3 rounded-card border border-border bg-surface-muted p-4 sm:grid-cols-3 sm:p-5" aria-label="Page purpose and connection status">
      {items.map((item) => {
        const Icon = item.icon;
        return <div key={item.label} className="flex items-start gap-3"><Icon className="mt-0.5 shrink-0 text-brand" aria-hidden="true" size={17} /><div><h2 className="text-xs font-bold uppercase tracking-wide text-brand">{item.label}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.value}</p></div></div>;
      })}
    </section>
  );
}
