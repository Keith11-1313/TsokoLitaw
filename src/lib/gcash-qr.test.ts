import { describe, expect, it } from "vitest";
import { createGcashQrPayload, qrChecksum } from "./gcash-qr";

const fields =
  "00020101021227100006SAMPLE520400005303608540550.005802PH5909TEST NAME6006MANILA610412346304";
const base = fields + qrChecksum(fields);
describe("GCash QR", () => {
  it("replaces the amount, length and CRC without changing recipient fields", () => {
    const qr = createGcashQrPayload(base, 85.5);
    expect(qr).toContain("540585.50");
    expect(qr).toContain("27100006SAMPLE");
    expect(qr.slice(-4)).toBe(qrChecksum(qr.slice(0, -4)));
    expect(createGcashQrPayload(qr, 50)).toBe(base);
    expect(createGcashQrPayload(base, 100)).toContain("5406100.00");
  });
  it.each([0, -1, NaN, Infinity, 1.001, 100000000])("rejects invalid amount %s", (amount) => {
    expect(() => createGcashQrPayload(base, amount)).toThrow();
  });
  it("rejects damaged CRC and unsupported currency", () => {
    expect(() => createGcashQrPayload(base.slice(0, -1) + "X", 10)).toThrow();
    const wrong = fields.replace("5303608", "5303840");
    expect(() => createGcashQrPayload(wrong + qrChecksum(wrong), 10)).toThrow();
  });
});
