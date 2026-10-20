// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuditPagination } from "./audit-pagination";
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(cleanup);
beforeEach(() => replace.mockClear());
const filters = {
  q: "Alex",
  area: "account",
  from: "2026-10-01",
  to: "2026-10-21",
  page: 1,
  size: 20,
};
it("preserves filters for numbered navigation and resets page on row-size changes", async () => {
  const user = userEvent.setup();
  render(<AuditPagination filters={filters} totalCount={80} shown={20} />);
  await user.click(screen.getByRole("button", { name: "Page 2" }));
  expect(replace).toHaveBeenCalledWith(expect.stringContaining("page=2"), { scroll: false });
  expect(replace.mock.calls[0][0]).toContain("area=account");
  await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
  await user.click(screen.getByRole("option", { name: "50" }));
  expect(replace.mock.calls.at(-1)?.[0]).toContain("size=50");
  expect(replace.mock.calls.at(-1)?.[0]).not.toContain("page=");
});
it("hides page navigation on a single page", () => {
  render(<AuditPagination filters={filters} totalCount={2} shown={2} />);
  expect(screen.queryByRole("navigation")).toBeNull();
});
