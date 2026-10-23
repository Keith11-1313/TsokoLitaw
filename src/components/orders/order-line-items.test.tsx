// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OrderLineItems } from "./order-line-items";
import type { CustomerOrderItemSummary } from "@/lib/server-orders";

afterEach(cleanup);

describe("OrderLineItems per-box pricing", () => {
  it.each([
    { boxes: 1, extras: 1, price: 15 },
    { boxes: 2, extras: 1, price: 15 },
    { boxes: 3, extras: 2, price: 15 },
    { boxes: 2, extras: 2, price: 15.25 },
    { boxes: 2, extras: 0, price: 15 },
  ])(
    "keeps $boxes boxes and $extras paid extras per box consistent",
    ({ boxes, extras, price }) => {
      const perBox = 75 + 40 + extras * price;
      const item: CustomerOrderItemSummary = {
        id: "saved-order-item",
        name: "TsokoMuch (8 pcs)",
        quantity: boxes,
        lineTotal: perBox * boxes,
        basePrice: 75,
        coatingTotal: 40,
        coatings: ["Palitaw × 8"],
        addons: [
          {
            name: "Sea salt cream",
            quantity: boxes,
            quantityPerBox: 1,
            lineTotal: 0,
            isComplimentary: true,
          },
          ...(extras > 0
            ? [
                {
                  name: "Sea salt cream",
                  quantity: extras * boxes,
                  quantityPerBox: extras,
                  lineTotal: price * extras * boxes,
                  isComplimentary: false,
                },
              ]
            : []),
        ],
      };
      const { container } = render(<OrderLineItems items={[item]} showPriceBreakdown />);
      const displayedComponents = [...container.querySelectorAll("dl dd")].map((entry) =>
        Number(entry.textContent?.replace(/[^0-9.]/g, "")),
      );
      expect(displayedComponents.reduce((sum, value) => sum + value, 0)).toBe(perBox);
      expect(perBox * boxes).toBe(item.lineTotal);
      const paidRow = screen.queryByText("Additional extra")?.closest("div");
      if (extras > 0) {
        expect(paidRow?.querySelector("dd")?.textContent).toBe(`₱${(price * extras).toFixed(2)}`);
        expect(screen.getByText(`Sea salt cream × ${extras}`)).toBeTruthy();
      } else {
        expect(paidRow).toBeUndefined();
      }
    },
  );
});
