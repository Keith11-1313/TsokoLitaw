"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import { CustomSelect } from "@/components/ui/custom-select";
import { auditHref, type AuditFilters } from "@/lib/audit-log";
export function AuditPagination({
  filters,
  totalCount,
  shown,
}: {
  filters: AuditFilters;
  totalCount: number;
  shown: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (page: number, size = filters.size) => {
    if (pending) return;
    startTransition(() => router.replace(auditHref({ ...filters, page, size }), { scroll: false }));
  };
  return (
    <div
      className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground xl:flex-row xl:items-center xl:justify-between"
      aria-busy={pending}
    >
      <p>
        Showing {shown ? (filters.page - 1) * filters.size + 1 : 0}–
        {Math.min((filters.page - 1) * filters.size + shown, totalCount)} of {totalCount} events
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <CustomSelect
            className="w-24"
            label="Rows per page"
            hideLabel
            disabled={pending}
            value={String(filters.size)}
            options={[10, 20, 50, 100].map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            onChange={(size) => {
              if (Number(size) !== filters.size) navigate(1, Number(size));
            }}
          />
        </div>
        <Pagination
          label="Audit log pages"
          page={filters.page}
          totalPages={Math.max(1, Math.ceil(totalCount / filters.size))}
          onPageChange={(page) => navigate(page)}
        />
      </div>
    </div>
  );
}
