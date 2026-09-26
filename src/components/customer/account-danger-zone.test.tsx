// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDangerZone } from "@/components/customer/account-danger-zone";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  requestDeletion: vi.fn(),
  cancelDeletion: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/app/profile/actions", () => ({
  requestAccountDeletionAction: mocks.requestDeletion,
  cancelAccountDeletionAction: mocks.cancelDeletion,
}));

afterEach(cleanup);

describe("AccountDangerZone", () => {
  it("closes after scheduling and replaces the trigger so the request cannot be repeated", async () => {
    mocks.refresh.mockReset();
    mocks.requestDeletion.mockReset().mockResolvedValue({
      status: "success",
      message: "Account deletion is scheduled in 90 days.",
    });

    render(<AccountDangerZone deletionScheduledFor={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Schedule account deletion" }));
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule deletion" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "Schedule account deletion" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeTruthy();
    expect(mocks.requestDeletion).toHaveBeenCalledOnce();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
