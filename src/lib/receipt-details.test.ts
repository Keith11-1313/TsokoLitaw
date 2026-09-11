import { expect, it } from "vitest";
import {
  extractReceiptDetails,
  getReceiptReadWarning,
  isReceiptTimePlausible,
} from "./receipt-details";
it("extracts hints from explicit labels without substituting the expected total", () => {
  expect(
    extractReceiptDetails(
      "Reference No.: 1234 5678 9012\nAmount Sent: PHP 85.50\nRecipient: TEST NAME\n2026-09-10 20:03",
    ),
  ).toEqual({
    reference: "123456789012",
    amount: "85.50",
    recipient: "TEST NAME",
    paidAt: "2026-09-10T20:03",
  });
});
it("leaves absent details blank", () => {
  expect(extractReceiptDetails("Available balance PHP 400.00\nNext")).toEqual({
    reference: "",
    amount: "",
    recipient: "",
    paidAt: "",
  });
});

it("extracts a GoTyme to GCash transfer from real OCR wording", () => {
  expect(
    extractReceiptDetails(
      "To\nJerald Esmeria\n******8586\nG-Xchange, Inc (GCash)\nAmount\n£100.00\nReference No.\nIT0250916042024001\nDate\n16 Sep 2025 at 12:20 PM",
    ),
  ).toEqual({
    reference: "IT0250916042024001",
    amount: "100.00",
    recipient: "Jerald Esmeria",
    paidAt: "2025-09-16T12:20",
  });
});

it("extracts GCash receipt fields when the date follows the reference", () => {
  expect(
    extractReceiptDetails(
      "JU...N RH-Y M.\n+63 985 403 8001\nSent via GCash\nAmount\n1,000.00\nTotal Amount Sent\n£1,000.00\nRef No. 2041 737 988645\nJun 11,2026 8:37 AM",
    ),
  ).toEqual({
    reference: "2041737988645",
    amount: "1000.00",
    recipient: "JU...N RH-Y M.",
    paidAt: "2026-06-11T08:37",
  });
});

it("extracts bank transfer labels and a 24-hour date", () => {
  expect(
    extractReceiptDetails(
      "To\nJERALD ESMERIA\nGoTyme Bank\nTransfer Amount\nPHP 100.00\nReference Number\n484117\nTransaction Date & Time\n10 Sep 2026, 09:31",
    ),
  ).toEqual({
    reference: "484117",
    amount: "100.00",
    recipient: "JERALD ESMERIA",
    paidAt: "2026-09-10T09:31",
  });
});

it("warns instead of prefilling a load-purchase receipt", () => {
  const text =
    "Buy Load Transaction for 09945957459\nAmount\n-50.00\nDate & Time\nAug 21, 2026 10:04 AM\nReference Number\n207147088";
  expect(getReceiptReadWarning(text)).toContain("load-purchase receipt");
});

it("accepts only receipt times that could belong to the new order", () => {
  const now = Date.parse("2026-09-11T12:00:00.000Z");
  const createdAt = "2026-09-11T11:30:00.000Z";

  expect(isReceiptTimePlausible(new Date("2026-09-11T11:29:00.000Z"), createdAt, now)).toBe(true);
  expect(isReceiptTimePlausible(new Date("2026-09-10T11:30:00.000Z"), createdAt, now)).toBe(false);
  expect(isReceiptTimePlausible(new Date("2026-09-11T12:06:00.000Z"), createdAt, now)).toBe(false);
});
