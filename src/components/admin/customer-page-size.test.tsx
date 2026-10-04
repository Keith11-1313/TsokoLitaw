// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerPageSize } from "./customer-page-size";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(cleanup);
beforeEach(() => replace.mockClear());

describe("Customer page size", () => {
  it("automatically applies the selected size, preserves search, and resets the page", async () => {
    const user = userEvent.setup();
    render(<CustomerPageSize pageSize={20} search="A & B" />);
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(screen.getByRole("option", { name: "50" }));
    expect(replace).toHaveBeenCalledWith("/admin/customers?q=A+%26+B&size=50", { scroll: false });
  });

  it("does not navigate when selecting the existing size", async () => {
    const user = userEvent.setup();
    render(<CustomerPageSize pageSize={20} search="" />);
    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(screen.getByRole("option", { name: "20" }));
    expect(replace).not.toHaveBeenCalled();
  });
});
