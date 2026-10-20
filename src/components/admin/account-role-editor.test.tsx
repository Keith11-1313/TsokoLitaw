// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountRoleEditor } from "./account-role-editor";

const mocks = vi.hoisted(() => ({ assign: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/admin/accounts/actions", () => ({ assignAccountRole: mocks.assign }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

async function openConfirmation() {
  render(<AccountRoleEditor userId="account" name="Alex" role="customer" disabled={false} />);
  fireEvent.click(screen.getByRole("combobox", { name: "Role for Alex" }));
  fireEvent.click(screen.getByRole("option", { name: "Staff" }));
  await Promise.resolve();
  const trigger = screen.getByRole("button", { name: "Assign role" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

it("requires a custom confirmation and restores focus on Escape without assigning", async () => {
  const trigger = await openConfirmation();
  expect(screen.getByRole("dialog", { name: "Change account role?" })).toBeTruthy();
  expect(document.body.style.overflow).toBe("hidden");
  expect(mocks.assign).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).not.toBe("hidden");
});

it("confirms once and prevents dismissal while saving, then refreshes on success", async () => {
  let resolve!: (result: { status: string; message: string }) => void;
  mocks.assign.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await openConfirmation();
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
  await waitFor(() =>
    expect(mocks.assign).toHaveBeenCalledWith({
      userId: "account",
      expectedRole: "customer",
      nextRole: "staff",
    }),
  );
  expect(
    (
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Saving…",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBeTruthy();
  resolve({ status: "success", message: "Account role updated and audited." });
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows a failed result without claiming success or refreshing", async () => {
  mocks.assign.mockResolvedValue({ status: "error", message: "Role was not changed." });
  await openConfirmation();
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Role was not changed."));
  expect(mocks.refresh).not.toHaveBeenCalled();
});

it("keeps protected or unchanged role controls disabled", () => {
  render(<AccountRoleEditor userId="self" name="Me" role="admin" disabled />);
  expect((screen.getByRole("button", { name: "Assign role" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});
