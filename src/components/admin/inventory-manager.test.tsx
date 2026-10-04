// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InventoryManager } from "./inventory-manager";

vi.mock("@/app/admin/inventory/actions", () => ({
  consumeInventoryAction: vi.fn(),
  saveInventoryAction: vi.fn(),
}));
afterEach(cleanup);

const record = {
  id: "stock-1",
  pickupDate: "2026-10-07",
  productId: "product-1",
  productName: "TsokoLitaw",
  stockTotal: 100,
  stockReserved: 0,
  stockConsumed: 3,
  stockAvailable: 97,
  updatedAt: "2026-10-04T08:00:00Z",
  adjustments: [
    {
      id: "adjustment-1",
      quantityDelta: -3,
      reason: "WASTE",
      notes: "Damaged during preparation",
      createdAt: "2026-10-04T08:00:00Z",
    },
  ],
};

it("shows saved notes and signed piece changes in date-specific stock history", () => {
  render(
    <InventoryManager
      product={{ id: "product-1", name: "TsokoLitaw" }}
      dates={[]}
      records={[record]}
    />,
  );
  expect(screen.getByText("Stock history")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Stock history" }).closest("details")).toBeNull();
  expect(screen.getByText("Damaged during preparation")).toBeTruthy();
  expect(screen.getByText("Unusable pieces · -3 pieces")).toBeTruthy();
  expect(document.querySelector("time")?.getAttribute("datetime")).toBe(
    record.adjustments[0].createdAt,
  );
});

it("shows an honest empty history", () => {
  render(
    <InventoryManager
      product={{ id: "product-1", name: "TsokoLitaw" }}
      dates={[]}
      records={[{ ...record, adjustments: [] }]}
    />,
  );
  expect(screen.getByText("No stock adjustments recorded for this date.")).toBeTruthy();
});
