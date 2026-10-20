"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { Pagination } from "@/components/ui/pagination";

type DirectoryQuery = { q: string; role: string; size: number };
function href(query: DirectoryQuery, page = 1) {
  return `/admin/accounts?${new URLSearchParams({ ...(query.q.trim() ? { q: query.q.trim() } : {}), ...(query.role ? { role: query.role } : {}), size: String(query.size), ...(page > 1 ? { page: String(page) } : {}) })}`;
}

export function AccountDirectorySearch({ q, role, size }: DirectoryQuery) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const navigate = (query: DirectoryQuery) => {
    if (timer.current) clearTimeout(timer.current);
    startTransition(() => router.replace(href(query), { scroll: false }));
  };
  return (
    <form
      role="search"
      aria-label="Search account roles"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q: value, role, size });
      }}
      className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
    >
      <label className="relative block min-w-0 flex-1 sm:w-80">
        <span className="sr-only">Search accounts</span>
        <Search
          aria-hidden="true"
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={value}
          maxLength={100}
          placeholder="Search name or email"
          className="min-h-12 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-focus focus:ring-2 focus:ring-focus/20"
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => navigate({ q: next, role, size }), 350);
          }}
        />
      </label>
      <CustomSelect
        label="Account role filter"
        hideLabel
        value={role}
        options={[
          { value: "", label: "All roles" },
          { value: "customer", label: "Customer" },
          { value: "staff", label: "Staff" },
          { value: "admin", label: "Admin" },
        ]}
        onChange={(next) => navigate({ q: value, role: next, size })}
        className="sm:w-44"
      />
    </form>
  );
}

export function AccountDirectoryPagination({
  q,
  role,
  size,
  page,
  totalCount,
  shown,
}: DirectoryQuery & { page: number; totalCount: number; shown: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (nextSize: number, nextPage = 1) =>
    startTransition(() =>
      router.replace(href({ q, role, size: nextSize }, nextPage), { scroll: false }),
    );
  return (
    <div
      className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground xl:flex-row xl:items-center xl:justify-between"
      aria-busy={pending}
    >
      <p>
        Showing {shown ? (page - 1) * size + 1 : 0}–
        {Math.min((page - 1) * size + shown, totalCount)} of {totalCount} accounts
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <CustomSelect
            label="Rows per page"
            hideLabel
            className="w-24"
            disabled={pending}
            value={String(size)}
            options={[10, 20, 50, 100].map((value) => ({
              value: String(value),
              label: String(value),
            }))}
            onChange={(value) => {
              if (Number(value) !== size) navigate(Number(value));
            }}
          />
        </div>
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(totalCount / size))}
          label="Account directory pages"
          onPageChange={(next) => {
            if (!pending) navigate(size, next);
          }}
        />
      </div>
    </div>
  );
}
