// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { submitManualReceipt } from "@/app/orders/[orderId]/payment/actions";
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
  vi.mocked(submitManualReceipt).mockReset();
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

it("keeps submit actionable and shows a validation message for incomplete details", async () => {
  render(<ManualReceiptForm orderId="order-1" />);

  const submit = screen.getByRole("button", {
    name: "Submit for verification",
  }) as HTMLButtonElement;
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);

  expect(screen.getByRole("status").textContent).toContain(
    "Complete the required fields and correct the highlighted values.",
  );
  expect(submitManualReceipt).not.toHaveBeenCalled();
});

it("submits the image and reviewed fields and shows the server result", async () => {
  vi.mocked(submitManualReceipt).mockResolvedValue({
    status: "error",
    message: "The receipt date and time must be for this order.",
  });
  render(<ManualReceiptForm orderId="order-1" />);
  const receipt = new File(["receipt"], "receipt.png", { type: "image/png" });

  fireEvent.change(screen.getByLabelText("Completed payment receipt"), {
    target: { files: [receipt] },
  });
  await waitFor(() => expect(ocr.recognize).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect((screen.getByLabelText("Transaction or reference ID") as HTMLInputElement).value).toBe(
      "IT0250916042024001",
    ),
  );
  const confirmation = screen.getByRole("checkbox", {
    name: /I have completed this payment and checked that these details match my receipt/i,
  }) as HTMLInputElement;
  await waitFor(() => expect(confirmation.disabled).toBe(false));
  fireEvent.click(confirmation);
  expect(confirmation.checked).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Submit for verification" }));

  await waitFor(() => expect(submitManualReceipt).toHaveBeenCalledTimes(1));
  const submittedForm = vi.mocked(submitManualReceipt).mock.calls[0]?.[1];
  const submittedReceipt = submittedForm?.get("receipt");
  expect(submittedReceipt).toBeInstanceOf(File);
  expect((submittedReceipt as File).name).toBe("receipt.png");
  expect((submittedReceipt as File).type).toBe("image/png");
  expect(submittedForm?.get("reference")).toBe("IT0250916042024001");
  expect(screen.getByRole("status").textContent).toContain(
    "The receipt date and time must be for this order.",
  );
});
