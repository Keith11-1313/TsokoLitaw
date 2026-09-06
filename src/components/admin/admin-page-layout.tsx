import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminContent } from "@/components/layout/admin-content";

interface AdminPageLayoutProps {
  activePath: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPageLayout({
  activePath,
  title,
  actions,
  children,
}: AdminPageLayoutProps) {
  return (
    <AdminShell activePath={activePath}>
      <AdminContent>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-[2rem] leading-tight text-foreground sm:text-[2.25rem]">
            {title}
          </h1>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </header>
        <div className="mt-7">{children}</div>
      </AdminContent>
    </AdminShell>
  );
}
