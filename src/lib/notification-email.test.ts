import { describe, expect, it } from "vitest";
import {
  buildOrderCancelledEmail,
  buildOrderConfirmationEmail,
  buildReadyForPickupEmail,
  buildRefundCompletedEmail,
  buildRefundFailedEmail,
  buildRefundProcessingEmail,
} from "./notification-email";

describe("buildOrderConfirmationEmail", () => {
  it("renders the immutable order and pickup summary", () => {
    const email = buildOrderConfirmationEmail({
      orderNumber: "TL-0042",
      customerName: "Jerald Esmeria",
      total: 58,
      pickupDate: "2026-08-31",
      pickupWindow: "7:00 AM–8:00 AM",
      pickupLocation: "UCC Congress — 3rd Floor",
      orderUrl: "https://www.tsokolitaw.com/orders/42",
      items: [{
        name: "Box of 4",
        quantity: 1,
        coatings: ["Cocoa"],
        addon: "Extra sea salt cream × 1",
      }],
    });

    expect(email.subject).toBe("Order TL-0042 confirmed");
    expect(email.text).toContain("Monday, August 31, 2026");
    expect(email.text).toContain("₱58.00");
    expect(email.html).toContain("UCC Congress — 3rd Floor");
    expect(email.html).toContain("https://www.tsokolitaw.com/orders/42");
  });

  it("escapes customer and item content in HTML", () => {
    const email = buildOrderConfirmationEmail({
      orderNumber: "TL-0043",
      customerName: "<Customer>",
      total: 0,
      pickupDate: "2026-09-01",
      pickupWindow: "9:00 AM–10:00 AM",
      pickupLocation: "Campus & Court",
      orderUrl: "https://www.tsokolitaw.com/orders/43",
      items: [{ name: "Box <4>", quantity: 1, coatings: [], addon: null }],
    });

    expect(email.html).not.toContain("<Customer>");
    expect(email.html).toContain("&lt;Customer&gt;");
    expect(email.html).toContain("Campus &amp; Court");
  });

  it("renders ready-for-pickup instructions without claiming completion", () => {
    const email = buildReadyForPickupEmail({
      orderNumber: "TL-0044",
      customerName: "Jerald Esmeria",
      total: 40,
      pickupDate: "2026-08-31",
      pickupWindow: "7:00 AM–8:00 AM",
      pickupLocation: "UCC Congress — Covered Court",
      orderUrl: "https://www.tsokolitaw.com/orders/44",
      items: [],
    });

    expect(email.subject).toBe("Order TL-0044 is ready for pickup");
    expect(email.text).toContain("within the scheduled pickup window");
    expect(email.html).toContain("UCC Congress — Covered Court");
    expect(email.text).not.toContain("completed");
  });

  it("distinguishes unpaid and paid cancellations", () => {
    const base = {
      orderNumber: "TL-0045",
      customerName: "Jerald Esmeria",
      orderUrl: "https://www.tsokolitaw.com/orders/45",
    };
    expect(buildOrderCancelledEmail({ ...base, refundAmount: null }).text)
      .toContain("No payment was collected");
    expect(buildOrderCancelledEmail({ ...base, refundAmount: 80 }).text)
      .toContain("full refund of ₱80.00");
  });

  it("renders distinct refund lifecycle emails", () => {
    const input = {
      orderNumber: "TL-0046",
      customerName: "Jerald Esmeria",
      orderUrl: "https://www.tsokolitaw.com/orders/46",
      refundAmount: 80,
    };

    expect(buildRefundProcessingEmail(input).subject).toContain("Refund processing");
    expect(buildRefundCompletedEmail(input).subject).toContain("Refund completed");
    const failed = buildRefundFailedEmail(input);
    expect(failed.subject).toContain("needs attention");
    expect(failed.text).toContain("Do not send account details by email");
  });
});
