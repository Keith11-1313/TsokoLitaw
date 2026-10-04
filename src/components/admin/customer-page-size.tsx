"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/ui/custom-select";

export function CustomerPageSize({ pageSize, search }: { pageSize: number; search: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      <span className="text-sm text-muted-foreground">Rows per page</span>
      <CustomSelect
        label="Rows per page"
        hideLabel
        className="w-24"
        value={String(pageSize)}
        options={[10, 20, 50, 100].map((size) => ({ value: String(size), label: String(size) }))}
        disabled={pending}
        onChange={(size) => {
          if (size === String(pageSize)) return;
          const query = new URLSearchParams({ ...(search ? { q: search } : {}), size });
          startTransition(() => router.replace(`/admin/customers?${query}`, { scroll: false }));
        }}
      />
      <span className="sr-only" role="status">
        {pending ? "Updating customer list" : ""}
      </span>
    </div>
  );
}
