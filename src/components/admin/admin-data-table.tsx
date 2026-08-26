import type { ReactNode } from "react";

export interface AdminTableColumn {
  key: string;
  label: string;
}

interface AdminDataTableProps {
  caption: string;
  columns: readonly AdminTableColumn[];
  rows: readonly Record<string, ReactNode>[];
  minimumWidth?: string;
}

export function AdminDataTable({
  caption,
  columns,
  rows,
  minimumWidth = "48rem",
}: AdminDataTableProps) {
  return (
    <section className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
      <div className="overflow-x-auto">
        <table
          className="w-full table-auto border-collapse text-left text-sm"
          style={{ minWidth: minimumWidth }}
        >
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="h-12 bg-surface-muted text-xs text-foreground">
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={`px-4 font-bold ${index === 0 ? "rounded-l-control" : ""} ${
                    index === columns.length - 1 ? "rounded-r-control" : ""
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  No records are available yet.
                </td>
              </tr>
            ) : rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="min-h-14 border-b border-border last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-muted-foreground">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
