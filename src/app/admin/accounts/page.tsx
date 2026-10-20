import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AccountRoleEditor } from "@/components/admin/account-role-editor";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { CustomerAvatar } from "@/components/admin/customer-avatar";
import { getAdminAccountAvatars } from "@/lib/server-customers";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata = { title: "Account roles | TsokoLitaw" };
export default async function AccountRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const actor = await requireAdmin("/admin/accounts");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  let query = createAdminSupabaseClient()
    .from("profiles")
    .select("id,full_name,email,role,is_active,deletion_scheduled_for", { count: "exact" })
    .order("email")
    .order("id");
  // Exact email lookup avoids exposing PostgREST filter syntax through input.
  if (q) query = query.ilike("email", q.replace(/[%_]/g, ""));
  const { data, error, count } = await query.range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("Account roles could not be loaded.");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / 20));
  if (page > totalPages) {
    redirect(`/admin/accounts?${new URLSearchParams({ q, page: String(totalPages) })}`);
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
  const href = (next: number) =>
    `/admin/accounts?${new URLSearchParams({ q, page: String(next) })}`;
  const searchForm = (
    <form action="/admin/accounts" method="get" className="flex w-full flex-wrap gap-2 sm:w-auto">
      <label htmlFor="account-email" className="sr-only">
        Find account by exact email
      </label>
      <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
        <Search
          aria-hidden="true"
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="account-email"
          name="q"
          defaultValue={q}
          type="email"
          placeholder="Exact account email"
          maxLength={100}
          className="min-h-12 w-full rounded-control border border-border bg-background pl-11 pr-4 outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
        />
      </div>
      <button className={cn(primaryButtonClassName, "min-h-12 px-6")}>Search</button>
      {q ? (
        <Link className={cn(secondaryButtonClassName, "min-h-12 px-6")} href="/admin/accounts">
          Clear
        </Link>
      ) : null}
    </form>
  );
  return (
    <AdminPageLayout activePath="/admin/accounts" title="Account roles" actions={searchForm}>
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
      <nav
        aria-label="Account role pages"
        className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
      >
        <span>
          {count
            ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, count)} of ${count} accounts`
            : "0 accounts"}
        </span>
        {(count ?? 0) > 20 ? (
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {Math.ceil((count ?? 0) / 20)}
            </span>
            {page > 1 ? (
              <Link
                aria-label="Previous account page"
                className={secondaryButtonClassName}
                href={href(page - 1)}
              >
                <ChevronLeft aria-hidden="true" size={17} />
              </Link>
            ) : null}
            {page * 20 < (count ?? 0) ? (
              <Link
                aria-label="Next account page"
                className={secondaryButtonClassName}
                href={href(page + 1)}
              >
                <ChevronRight aria-hidden="true" size={17} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </nav>
    </AdminPageLayout>
  );
}
