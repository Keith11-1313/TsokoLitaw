import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

interface AdminShellProps {
  activePath: string;
  children: ReactNode;
}

export function AdminShell({ activePath, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar
        activePath={activePath}
        adminName="Chef Administrator"
        adminEmail="tsokolitaw@gmail.com"
      />
      {children}
    </div>
  );
}
