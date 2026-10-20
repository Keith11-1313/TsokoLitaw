import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AuditPagination } from "@/components/admin/audit-pagination";
import { UncontrolledCustomSelect } from "@/components/ui/custom-select";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { getAdminAuditLog } from "@/lib/server-audit";
import { auditActionLabel, auditAreas, auditHref } from "@/lib/audit-log";

export const metadata = { title: "Audit log | TsokoLitaw" };
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filters, entries, totalCount } = await getAdminAuditLog(await searchParams);
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.size));
  if (filters.page > totalPages) redirect(auditHref({ ...filters, page: totalPages }));
  const rows: Record<string, ReactNode>[] = entries.map((entry) => ({
    time: (
      <time dateTime={entry.createdAt} className="whitespace-nowrap text-xs">
        {new Intl.DateTimeFormat("en-PH", {
          timeZone: "Asia/Manila",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(entry.createdAt))}
      </time>
    ),
    actor: (
      <div className="min-w-40">
        <strong className="block text-foreground">{entry.actorName}</strong>
        <span className="block break-all text-xs">{entry.actorEmail}</span>
      </div>
    ),
    action: (
      <span className="font-bold capitalize text-foreground">{auditActionLabel(entry.action)}</span>
    ),
    target: (
      <div className="min-w-40">
        <span className="block break-words capitalize text-foreground">{entry.target}</span>
        <span className="mt-1 block break-all text-xs">{entry.entityId}</span>
      </div>
    ),
    change: <p className="min-w-40 max-w-xs break-words text-sm">{entry.change}</p>,
  }));
  return (
    <AdminPageLayout activePath="/admin/audit" title="Audit log">
      <form
        key={auditHref(filters)}
        action="/admin/audit"
        method="get"
        className="mb-6 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_10rem_10rem_10rem_auto]"
      >
        <input type="hidden" name="size" value={filters.size} />
        <label className="block text-sm font-bold">
          Search
          <span className="relative mt-2 block">
            <Search
              aria-hidden="true"
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              name="q"
              maxLength={100}
              defaultValue={filters.q}
              placeholder="Name, email, action or record ID"
              className="min-h-12 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm font-normal outline-none focus:ring-2 focus:ring-focus"
            />
          </span>
        </label>
        <UncontrolledCustomSelect
          name="area"
          label="Action"
          defaultValue={filters.area}
          options={[
            { value: "", label: "All actions" },
            ...auditAreas.map((area) => ({
              value: area,
              label: area.charAt(0).toUpperCase() + area.slice(1),
            })),
          ]}
        />
        <label className="block text-sm font-bold">
          From
          <input
            name="from"
            type="date"
            defaultValue={filters.from}
            className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-3 font-normal outline-none focus:ring-2 focus:ring-focus"
          />
        </label>
        <label className="block text-sm font-bold">
          To
          <input
            name="to"
            type="date"
            defaultValue={filters.to}
            min={filters.from || undefined}
            className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-3 font-normal outline-none focus:ring-2 focus:ring-focus"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1">
          <button className={primaryButtonClassName} type="submit">
            Apply
          </button>
          {filters.q || filters.area || filters.from || filters.to ? (
            <Link className={secondaryButtonClassName} href="/admin/audit">
              Clear
            </Link>
          ) : null}
        </div>
      </form>
      {filters.from && filters.to && filters.from > filters.to ? (
        <p role="alert" className="mb-4 text-sm text-danger-foreground">
          Choose an end date on or after the start date.
        </p>
      ) : null}
      <AdminDataTable
        caption="Read-only business audit events, times in Philippine time"
        columns={[
          { key: "time", label: "Recorded (PH time)" },
          { key: "actor", label: "Performed by" },
          { key: "action", label: "Action" },
          { key: "target", label: "Affected record" },
          { key: "change", label: "Change" },
        ]}
        rows={rows}
        minimumWidth="60rem"
        emptyMessage="No audit events match these filters."
      />
      <AuditPagination filters={filters} totalCount={totalCount} shown={entries.length} />
    </AdminPageLayout>
  );
}
