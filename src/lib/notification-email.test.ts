import { describe, expect, it } from "vitest";
import { buildOrderConfirmationEmail } from "./notification-email";

describe("buildOrderConfirmationEmail", () => {
  it("renders the immutable order and pickup summary", () => {
    const email = buildOrderConfirmationEmail({
      orderNumber: "TL-0042",
      customerName: "Jerald Esmeria",
      total: 58,
      pickupDate: "2026-08-31",
      pickupWindow: "7:00 AM–8:00 AM",
      pickupLocation: "UCC Congress — 3rd Floor",
      orderUrl: "https://tsokolitaw.com/orders/42",
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
    expect(email.html).toContain("https://tsokolitaw.com/orders/42");
  });

  it("escapes customer and item content in HTML", () => {
    const email = buildOrderConfirmationEmail({
      orderNumber: "TL-0043",
      customerName: "<Customer>",
      total: 0,
      pickupDate: "2026-09-01",
      pickupWindow: "9:00 AM–10:00 AM",
      pickupLocation: "Campus & Court",
      orderUrl: "https://tsokolitaw.com/orders/43",
      items: [{ name: "Box <4>", quantity: 1, coatings: [], addon: null }],
    });

    expect(email.html).not.toContain("<Customer>");
    expect(email.html).toContain("&lt;Customer&gt;");
    expect(email.html).toContain("Campus &amp; Court");
  });
});
