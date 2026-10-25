import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AccountRoleEditor } from "@/components/admin/account-role-editor";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { CustomerAvatar } from "@/components/admin/customer-avatar";
import { getAdminAccountAvatars } from "@/lib/server-customers";
import {
  AccountDirectorySearch,
  AccountDirectoryPagination,
} from "@/components/admin/account-directory-controls";
import { cn } from "@/lib/cn";

export const metadata = { title: "Account roles | TsokoLitaw" };
export default async function AccountRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; role?: string; size?: string }>;
}) {
  const actor = await requireAdmin("/admin/accounts");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const role = ["customer", "staff", "admin"].includes(params.role ?? "") ? params.role! : "";
  const requestedSize = Number(params.size);
  const size = [10, 20, 50, 100].includes(requestedSize) ? requestedSize : 20;
  let query = createAdminSupabaseClient()
    .from("profiles")
    .select("id,full_name,email,role,is_active,deletion_scheduled_for", { count: "exact" })
    .order("email")
    .order("id");
  // Strip filter grammar and wildcard characters; never interpolate raw input.
  const term = q.replace(/[^\p{L}\p{N}\s@+.'-]/gu, "").trim();
  if (q && !term) query = query.eq("id", "0");
  else if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (role) query = query.eq("role", role as "customer" | "staff" | "admin");
  const { data, error, count } = await query.range((page - 1) * size, page * size - 1);
  if (error) throw new Error("Account roles could not be loaded.");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / size));
  if (page > totalPages) {
    redirect(
      `/admin/accounts?${new URLSearchParams({ q, role, size: String(size), page: String(totalPages) })}`,
    );
  }
  const avatars = await getAdminAccountAvatars((data ?? []).map((account) => account.id));
  const rows: Record<string, ReactNode>[] = (data ?? []).map((account) => ({
    account: (
      <div className="flex min-w-0 items-center gap-3">
        <CustomerAvatar avatarUrl={avatars.get(account.id) ?? null} />
        <div className="min-w-0">
          <strong className="block text-foreground">
            {account.full_name || "Unnamed account"}
          </strong>
          <span className="block break-all text-xs">{account.email}</span>
          {account.id === actor.id ? <span className="text-xs">Your account</span> : null}
        </div>
      </div>
    ),
    status: (
      <span
        className={cn(
          "inline-flex rounded-full px-3 py-1 text-xs font-bold",
          account.is_active
            ? "bg-success-background text-success-foreground"
            : "bg-danger-background text-danger-foreground",
        )}
      >
        {account.is_active ? "Active" : "Inactive"}
      </span>
    ),
    role: (
      <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs font-bold capitalize text-foreground">
        {account.role}
      </span>
    ),
    access: (
      <AccountRoleEditor
        key={`${account.id}-${account.role}`}
        userId={account.id}
        role={account.role}
        name={account.full_name || account.email}
        disabled={
          account.id === actor.id || !account.is_active || Boolean(account.deletion_scheduled_for)
        }
      />
    ),
  }));
  return (
    <AdminPageLayout
      activePath="/admin/accounts"
      title="Account roles"
      actions={<AccountDirectorySearch q={q} role={role} size={size} />}
    >
      <AdminDataTable
        caption="Account roles and access"
        columns={[
          { key: "account", label: "Account" },
          { key: "status", label: "Status" },
          { key: "role", label: "Current role" },
          { key: "access", label: "Change access" },
        ]}
        rows={rows}
        minimumWidth="50rem"
        emptyMessage="No matching accounts."
      />
      <AccountDirectoryPagination
        q={q}
        role={role}
        size={size}
        page={page}
        totalCount={count ?? 0}
        shown={data?.length ?? 0}
      />
    </AdminPageLayout>
  );
}
