// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PickupManager } from "./pickup-manager";

vi.mock("@/app/admin/pickup/actions", () => ({
  savePickupLocationAction: vi.fn(),
  savePickupScheduleAction: vi.fn(),
  savePickupSettingsAction: vi.fn(),
  setPickupDateOpenAction: vi.fn(),
}));

afterEach(cleanup);

describe("PickupManager", () => {
  it("shows the operating hours and explains an out-of-range window before submission", () => {
    render(
      <PickupManager
        dates={[]}
        locations={[
          {
            id: "75c0dbbf-8438-4fce-894f-a93e9aacbb6b",
            name: "UCC Congress — 3rd Floor",
            description: "",
            isActive: true,
          },
        ]}
        settings={{
          minimumLeadDays: 1,
          dailyCutoffTime: "17:00",
          graceMinutes: 15,
          operatingStart: "07:00",
          operatingEnd: "19:00",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add pickup date" }));

    expect(screen.getByText(/Schedule pickups between 7:00 AM and 7:00 PM/)).toBeTruthy();

    const endTime = screen.getByDisplayValue("08:00");
    fireEvent.change(endTime, { target: { value: "20:00" } });

    expect(screen.getByText("End time must be at or before 7:00 PM.")).toBeTruthy();
    expect(endTime.getAttribute("aria-invalid")).toBe("true");
    expect(
      (screen.getByRole("button", { name: "Publish pickup date" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
