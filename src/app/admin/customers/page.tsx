import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Gift,
  Repeat2,
  Search,
  UsersRound,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/admin-data-table";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { CustomerPageSize } from "@/components/admin/customer-page-size";
import { CustomerAvatar } from "@/components/admin/customer-avatar";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPhp } from "@/lib/commerce";
import { getAdminCustomerSummaries } from "@/lib/server-customers";

export const metadata: Metadata = { title: "Customers | TsokoLitaw Admin" };
const PAGE_SIZES = [10, 20, 50, 100];
const columns: readonly AdminTableColumn[] = [
  { key: "customer", label: "Customer" },
  { key: "account", label: "Account" },
  { key: "orders", label: "Completed purchases" },
  { key: "loyalty", label: "Loyalty activity" },
  { key: "last", label: "Last order" },
];

function formatDate(value: string | null) {
  if (!value) return "No orders yet";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const admin = await requireAdmin("/admin/customers");
  const parameters = await searchParams;
  const search = typeof parameters.q === "string" ? parameters.q.trim().slice(0, 100) : "";
  const requestedPage = typeof parameters.page === "string" ? Number(parameters.page) : 1;
  const currentPage = Number.isSafeInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), 1000000)
    : 1;
  const requestedSize = typeof parameters.size === "string" ? Number(parameters.size) : 20;
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : 20;
  const pageStart = (currentPage - 1) * pageSize;
  const { customers, totalCount } = await getAdminCustomerSummaries(
    admin.id,
    search,
    currentPage,
    pageSize,
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (currentPage > totalPages) {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    query.set("size", String(pageSize));
    if (totalPages > 1) query.set("page", String(totalPages));
    redirect(`/admin/customers${query.size ? `?${query.toString()}` : ""}`);
  }
  const returningCustomers = customers.filter((customer) => customer.completedOrders >= 2).length;
  const availableRewards = customers.reduce(
    (total, customer) => total + customer.availableRewards,
    0,
  );
  const redeemedRewards = customers.reduce(
    (total, customer) => total + customer.redeemedRewards,
    0,
  );
  const rows: readonly Record<string, ReactNode>[] = customers.map((customer) => ({
    customer: (
      <div className="flex min-w-56 items-center gap-3">
        <CustomerAvatar avatarUrl={customer.avatarUrl} />
        <span className="min-w-0">
          <strong className="block truncate text-foreground">
            {customer.fullName || "Unnamed customer"}
          </strong>
          <span className="block truncate text-xs">{customer.email}</span>
        </span>
      </div>
    ),
    account: (
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-foreground">
          Customer
        </span>
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-[0.6875rem] font-bold",
            customer.isActive
              ? "bg-success-background text-success-foreground"
              : "bg-danger-background text-danger-foreground",
          )}
        >
          {customer.isActive ? "Active" : "Inactive"}
        </span>
      </div>
    ),
    orders: (
      <span>
        <strong className="block text-foreground">
          {customer.completedOrders}{" "}
          {customer.completedOrders === 1 ? "completed order" : "completed orders"}
        </strong>
        <span className="text-xs">{formatPhp(customer.completedSpend)} paid value</span>
      </span>
    ),
    loyalty: (() => {
      const threshold = Math.max(customer.loyaltyThreshold, 1);
      const progress = customer.loyaltyCompletedOrders % threshold;
      const progressPercent = Math.min(100, Math.round((progress / threshold) * 100));

      return (
        <div className="min-w-52 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <strong className="text-foreground">
              {progress}/{threshold} toward next reward
            </strong>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-label={`${progress} of ${threshold} completed orders toward the next loyalty reward`}
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={progress}
          >
            <span
              className="block h-full rounded-full bg-success-foreground"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-[0.6875rem]">
            <span className="rounded-full bg-success-background px-2.5 py-1 text-success-foreground">
              {customer.availableRewards} available
            </span>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted-foreground">
              {customer.redeemedRewards} used
            </span>
          </div>
        </div>
      );
    })(),
    last: formatDate(customer.lastOrderAt),
  }));

  const pageHref = (page: number) =>
    `/admin/customers?${new URLSearchParams({
      ...(search ? { q: search } : {}),
      page: String(page),
      size: String(pageSize),
    })}`;
  const pageWindowStart = Math.max(2, Math.min(currentPage - 1, totalPages - 3));
  const pageNumbers = Array.from(
    new Set(
      totalPages <= 7
        ? Array.from({ length: totalPages }, (_, index) => index + 1)
        : [1, totalPages, pageWindowStart, pageWindowStart + 1, pageWindowStart + 2],
    ),
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const searchForm = (
    <form action="/admin/customers" method="get" className="flex w-full flex-wrap gap-2 sm:w-auto">
      <input type="hidden" name="size" value={pageSize} />
      <label className="relative block min-w-0 flex-1 sm:w-80 sm:flex-none">
        <span className="sr-only">Search customers</span>
        <Search
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={17}
        />
        <input
          name="q"
          type="search"
          defaultValue={search}
          maxLength={100}
          placeholder="Search name or email"
          className="min-h-12 w-full rounded-control border border-border bg-background pl-11 pr-4 outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
        />
      </label>
      <button type="submit" className={cn(primaryButtonClassName, "min-h-12 px-6")}>
        Search
      </button>
      {search ? (
        <Link
          href={`/admin/customers?size=${pageSize}`}
          className={cn(secondaryButtonClassName, "min-h-12 px-6")}
        >
          Clear
        </Link>
      ) : null}
    </form>
  );

  return (
    <AdminPageLayout activePath="/admin/customers" title="Customers" actions={searchForm}>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <AdminStatCard compact icon={UsersRound} label="Customers" value={String(totalCount)} />
        <AdminStatCard
          compact
          icon={Repeat2}
          label="Returning customers (shown)"
          value={String(returningCustomers)}
        />
        <AdminStatCard
          compact
          icon={Gift}
          label="Available rewards (shown)"
          value={String(availableRewards)}
        />
        <AdminStatCard
          compact
          icon={BadgeCheck}
          label="Used rewards (shown)"
          value={String(redeemedRewards)}
        />
      </div>

      <AdminDataTable
        caption="Account directory"
        columns={columns}
        rows={rows}
        minimumWidth="64rem"
        emptyMessage="No customers found."
      />
      <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground xl:flex-row xl:items-center xl:justify-between">
        <p>
          Showing {customers.length ? pageStart + 1 : 0}–
          {Math.min(pageStart + customers.length, totalCount)} of {totalCount} accounts
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <CustomerPageSize pageSize={pageSize} search={search} />
          {totalPages > 1 ? (
            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label="Customer directory pages"
            >
              <p className="text-sm text-muted-foreground sm:mr-1">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "First page", Icon: ChevronsLeft, page: 1, disabled: currentPage === 1 },
                  {
                    label: "Previous page",
                    Icon: ChevronLeft,
                    page: currentPage - 1,
                    disabled: currentPage === 1,
                  },
                ].map(({ label, Icon, page, disabled }) =>
                  disabled ? (
                    <button
                      key={label}
                      disabled
                      aria-label={label}
                      className="inline-flex size-11 items-center justify-center rounded-control border border-border opacity-40"
                    >
                      <Icon size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      key={label}
                      href={pageHref(page)}
                      aria-label={label}
                      className="inline-flex size-11 items-center justify-center rounded-control border border-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Icon size={16} aria-hidden="true" />
                    </Link>
                  ),
                )}
                {pageNumbers.map((page, index) => (
                  <span key={page} className="inline-flex items-center gap-2">
                    {index > 0 && page - pageNumbers[index - 1] > 1 ? (
                      <span aria-hidden="true">…</span>
                    ) : null}
                    <Link
                      href={pageHref(page)}
                      aria-label={`Page ${page}`}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={cn(
                        "inline-flex size-11 items-center justify-center rounded-control border text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        page === currentPage
                          ? "border-brand bg-brand text-surface"
                          : "border-border hover:bg-surface-muted",
                      )}
                    >
                      {page}
                    </Link>
                  </span>
                ))}
                {[
                  {
                    label: "Next page",
                    Icon: ChevronRight,
                    page: currentPage + 1,
                    disabled: currentPage === totalPages,
                  },
                  {
                    label: "Last page",
                    Icon: ChevronsRight,
                    page: totalPages,
                    disabled: currentPage === totalPages,
                  },
                ].map(({ label, Icon, page, disabled }) =>
                  disabled ? (
                    <button
                      key={label}
                      disabled
                      aria-label={label}
                      className="inline-flex size-11 items-center justify-center rounded-control border border-border opacity-40"
                    >
                      <Icon size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      key={label}
                      href={pageHref(page)}
                      aria-label={label}
                      className="inline-flex size-11 items-center justify-center rounded-control border border-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Icon size={16} aria-hidden="true" />
                    </Link>
                  ),
                )}
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </AdminPageLayout>
  );
}
