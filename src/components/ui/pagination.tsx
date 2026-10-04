import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  label,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const start = Math.max(2, Math.min(page - 1, totalPages - 3));
  const pages =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : [...new Set([1, start, start + 1, start + 2, totalPages])];
  const control = (name: string, target: number, Icon: typeof ChevronLeft, disabled: boolean) => (
    <button
      type="button"
      aria-label={name}
      disabled={disabled}
      onClick={() => onPageChange(target)}
      className="inline-flex size-11 items-center justify-center rounded-control border border-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-muted-foreground sm:mr-1">
        Page {page} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {control("First page", 1, ChevronsLeft, page === 1)}
        {control("Previous page", page - 1, ChevronLeft, page === 1)}
        {pages.map((number, index) => (
          <span key={number} className="inline-flex items-center gap-2">
            {index > 0 && number - pages[index - 1] > 1 ? <span aria-hidden="true">…</span> : null}
            <button
              type="button"
              aria-label={`Page ${number}`}
              aria-current={page === number ? "page" : undefined}
              onClick={() => onPageChange(number)}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-control border text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                page === number
                  ? "border-brand bg-brand text-surface"
                  : "border-border hover:bg-surface-muted",
              )}
            >
              {number}
            </button>
          </span>
        ))}
        {control("Next page", page + 1, ChevronRight, page === totalPages)}
        {control("Last page", totalPages, ChevronsRight, page === totalPages)}
      </div>
    </nav>
  );
}
