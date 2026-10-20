import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AccountRoleEditor } from "@/components/admin/account-role-editor";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
  const href = (next: number) =>
    `/admin/accounts?${new URLSearchParams({ q, page: String(next) })}`;
  return (
    <AdminPageLayout activePath="/admin/accounts" title="Account roles">
      <p className="mb-5 text-sm text-muted-foreground">
        Admin manages access; Staff handles transactions. You cannot change your own role. Resolve
        personal orders before assigning business access.
      </p>
      <form className="mb-6 flex flex-wrap gap-3">
        <label htmlFor="account-email" className="sr-only">
          Find account by exact email
        </label>
        <input
          id="account-email"
          name="q"
          defaultValue={q}
          type="email"
          placeholder="Exact account email"
          className="min-h-11 rounded-control border border-border bg-surface px-4"
        />
        <button className="min-h-11 rounded-full bg-brand px-5 text-surface">Search</button>
        <Link className="inline-flex min-h-11 items-center px-3 underline" href="/admin/accounts">
          Clear
        </Link>
      </form>
      <div className="divide-y divide-border rounded-card border border-border bg-surface px-5">
        {data?.map((account) => (
          <section
            key={`${account.id}-${account.role}`}
            className="flex flex-wrap items-center justify-between gap-4 py-5"
          >
            <div className="min-w-0">
              <h2 className="font-bold">{account.full_name || "Unnamed account"}</h2>
              <p className="break-all text-sm">{account.email}</p>
              <p className="text-xs text-muted-foreground">
                {account.is_active ? "Active" : "Inactive"}
                {account.id === actor.id ? " · Your account" : ""}
              </p>
            </div>
            <AccountRoleEditor
              userId={account.id}
              role={account.role}
              name={account.full_name || account.email}
              disabled={
                account.id === actor.id ||
                !account.is_active ||
                Boolean(account.deletion_scheduled_for)
              }
            />
          </section>
        ))}
        {!data?.length ? <p className="py-6">No matching accounts.</p> : null}
      </div>
      <nav aria-label="Account role pages" className="mt-5 flex items-center gap-5">
        <span>
          Page {page} · {count ?? 0} matching accounts
        </span>
        {page > 1 ? (
          <Link className="inline-flex min-h-11 items-center underline" href={href(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page * 20 < (count ?? 0) ? (
          <Link className="inline-flex min-h-11 items-center underline" href={href(page + 1)}>
            Next
          </Link>
        ) : null}
      </nav>
    </AdminPageLayout>
  );
}
