// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountDirectorySearch, AccountDirectoryPagination } from "./account-directory-controls";
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(cleanup);
beforeEach(() => replace.mockClear());
it("debounces live name/email search and keeps role and page size", async () => {
  render(<AccountDirectorySearch q="" role="staff" size={50} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search accounts" }), {
    target: { value: "Alex" },
  });
  expect(replace).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/admin/accounts?q=Alex&role=staff&size=50", {
      scroll: false,
    }),
  );
  expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
});
it("changes role without submitting a separate search button", async () => {
  const user = userEvent.setup();
  render(<AccountDirectorySearch q="Alex" role="" size={20} />);
  await user.click(screen.getByRole("combobox", { name: "Account role filter" }));
  await user.click(screen.getByRole("option", { name: "Staff" }));
  expect(replace).toHaveBeenCalledWith("/admin/accounts?q=Alex&role=staff&size=20", {
    scroll: false,
  });
});
it("uses numbered navigation and automatic row sizes while preserving filters", async () => {
  const user = userEvent.setup();
  render(
    <AccountDirectoryPagination
      q="Alex"
      role="staff"
      size={20}
      page={1}
      totalCount={34}
      shown={20}
    />,
  );
  expect((screen.getByRole("button", { name: "First page" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  await user.click(screen.getByRole("button", { name: "Page 2" }));
  expect(replace).toHaveBeenCalledWith("/admin/accounts?q=Alex&role=staff&size=20&page=2", {
    scroll: false,
  });
  await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
  await user.click(screen.getByRole("option", { name: "50" }));
  expect(replace).toHaveBeenLastCalledWith("/admin/accounts?q=Alex&role=staff&size=50", {
    scroll: false,
  });
});
it("hides navigation for a single page", () => {
  render(<AccountDirectoryPagination q="" role="" size={20} page={1} totalCount={4} shown={4} />);
  expect(screen.queryByRole("navigation")).toBeNull();
});
