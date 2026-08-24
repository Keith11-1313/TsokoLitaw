import type { ReactNode } from "react";
import { AdminScopeNote } from "@/components/admin/admin-scope-note";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminContent } from "@/components/layout/admin-content";

interface AdminPageLayoutProps {
  activePath: string;
  title: string;
  description: string;
  purpose: string;
  customerImpact: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPageLayout({
  activePath,
  title,
  description,
  purpose,
  customerImpact,
  actions,
  children,
}: AdminPageLayoutProps) {
  return (
    <AdminShell activePath={activePath}>
      <AdminContent>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-[2.25rem] leading-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </header>
        <div className="mt-6"><AdminScopeNote purpose={purpose} customerImpact={customerImpact} /></div>
        <div className="mt-8">{children}</div>
      </AdminContent>
    </AdminShell>
  );
}
