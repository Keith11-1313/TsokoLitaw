import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCustomersPage from "./page";

const { summaries, redirect } = vi.hoisted(() => ({ summaries: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: async () => ({ id: "admin" }) }));
vi.mock("@/lib/server-customers", () => ({ getAdminCustomerSummaries: summaries }));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/admin/admin-page-layout", () => ({
  AdminPageLayout: ({
    actions,
    children,
  }: {
    actions: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <main>
      {actions}
      {children}
    </main>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  summaries.mockResolvedValue({ customers: [], totalCount: 101 });
});

describe("Customers directory controls", () => {
  it("hides navigation for a single page and keeps the automatic size control", async () => {
    summaries.mockResolvedValue({ customers: [], totalCount: 0 });
    const html = renderToStaticMarkup(
      await AdminCustomersPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }),
    );
    expect(html).not.toContain("Customer directory pages");
    expect(html).not.toContain(">Apply<");
    expect(html).toContain("Rows per page");
  });

  it("shows bounded page links with ellipses for a large directory", async () => {
    summaries.mockResolvedValue({ customers: [], totalCount: 1000 });
    const html = renderToStaticMarkup(
      await AdminCustomersPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ page: "25" }),
      }),
    );
    expect(html).toContain("Page 25 of 50");
    for (const page of [1, 24, 25, 26, 50]) expect(html).toContain(`aria-label="Page ${page}"`);
    expect(html).not.toContain('aria-label="Page 2"');
    expect(html.match(/…/g)).toHaveLength(2);
    expect(html).toContain('aria-current="page"');
  });

  it("disables first/previous on the first page and next/last on the last", async () => {
    for (const page of ["1", "6"]) {
      const html = renderToStaticMarkup(
        await AdminCustomersPage({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({ page }),
        }),
      );
      expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
      expect(html).toContain(`aria-label="${page === "1" ? "First" : "Last"} page"`);
    }
  });
  it("uses the chosen size and retains it in search and page links", async () => {
    const html = renderToStaticMarkup(
      await AdminCustomersPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ q: "Jerald", size: "50", page: "2" }),
      }),
    );
    expect(summaries).toHaveBeenCalledWith("admin", "Jerald", 2, 50);
    expect(html).toContain("Rows per page");
    expect(html).toContain('name="size" value="50"');
    expect(html).toContain("page=3&amp;size=50");
    expect(html).not.toContain("On this page");
    expect(html).not.toContain("from completed orders shown");
  });

  it("falls back to a bounded default for invalid sizes", async () => {
    await AdminCustomersPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ size: "10000" }),
    });
    expect(summaries).toHaveBeenCalledWith("admin", "", 1, 20);
  });

  it("retains search and size when redirecting an out-of-range page", async () => {
    await AdminCustomersPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ q: "Jerald", size: "50", page: "99" }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/customers?q=Jerald&size=50&page=3");
  });
});
