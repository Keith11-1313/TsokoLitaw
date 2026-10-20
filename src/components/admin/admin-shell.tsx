import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireBusiness } from "@/lib/auth";

interface AdminShellProps {
  activePath: string;
  children: ReactNode;
}

export async function AdminShell({ activePath, children }: AdminShellProps) {
  const profile = await requireBusiness(activePath);
  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar
        activePath={activePath}
        adminName={profile.fullName || "Administrator"}
        adminEmail={profile.email}
        role={profile.role === "staff" ? "staff" : "admin"}
      />
      {children}
    </div>
  );
}
