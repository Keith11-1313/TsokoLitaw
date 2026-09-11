// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ManualReceiptForm } from "./manual-receipt-form";

const ocr = vi.hoisted(() => ({
  recognize: vi.fn(),
  setParameters: vi.fn(),
  terminate: vi.fn(),
}));

vi.mock("tesseract.js", () => ({
  PSM: { SPARSE_TEXT: "11" },
  createWorker: vi.fn(async () => ocr),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/orders/[orderId]/payment/actions", () => ({
  submitManualReceipt: vi.fn(),
}));

beforeEach(() => {
  ocr.recognize.mockReset().mockResolvedValue({
    data: {
      text: "To\nJerald Esmeria\nG-Xchange, Inc (GCash)\nAmount\n£100.00\nReference No.\nIT0250916042024001\nDate\n16 Sep 2025 at 12:20 PM",
    },
  });
  ocr.setParameters.mockReset().mockResolvedValue(undefined);
  ocr.terminate.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

it("reads immediately after upload and requires another upload to reread", async () => {
  render(<ManualReceiptForm orderId="order-1" />);
  const input = screen.getByLabelText("Completed payment receipt") as HTMLInputElement;
  const receipt = new File(["receipt"], "receipt.png", { type: "image/png" });

  fireEvent.change(input, { target: { files: [receipt] } });
  await waitFor(() => expect(ocr.recognize).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect((screen.getByLabelText("Transaction or reference ID") as HTMLInputElement).value).toBe(
      "IT0250916042024001",
    ),
  );
  expect(screen.queryByRole("button", { name: /read receipt/i })).toBeNull();

  fireEvent.click(input);
  fireEvent.change(input, { target: { files: [receipt] } });
  await waitFor(() => expect(ocr.recognize).toHaveBeenCalledTimes(2));
});
