// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProductConfigurator } from "./product-configurator";
import type { CommerceCatalog } from "@/types/commerce";

vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

const catalog: CommerceCatalog = {
  productId: "product",
  productName: "TsokoLitaw",
  productDescription: "Chocolate-filled Litaw",
  variants: [{ id: "mini", label: "TsokoMini (4 pcs)", pieceCount: 4, price: 40 }],
  coatings: [
    {
      id: "plain",
      name: "Plain",
      description: "Soft and chewy",
      imageSrc: "/images/placeholder.webp",
      pricePerPiece: 0,
      isDefault: true,
      tone: "plain",
    },
    {
      id: "cocoa",
      name: "Cocoa",
      description: "Cocoa finish",
      imageSrc: "/images/placeholder.webp",
      pricePerPiece: 5,
      isDefault: false,
      tone: "cocoa-coating",
    },
  ],
  addons: [{ id: "salt", name: "Sea salt cream", slug: "sea-salt", price: 15, isDefault: true }],
};

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe("mobile coating discovery", () => {
  it("links directly to photos and updates the same builder when a coating is selected", async () => {
    const user = userEvent.setup();
    render(<ProductConfigurator catalog={catalog} />);

    expect(screen.getByRole("link", { name: "Browse coating photos" }).getAttribute("href")).toBe(
      "#coatings-heading",
    );
    expect(screen.getByRole("heading", { name: "Choose your coating" }).getAttribute("id")).toBe(
      "coatings-heading",
    );

    await user.click(screen.getByRole("button", { name: /Cocoa Cocoa finish/ }));

    expect(screen.getByText("Cocoa", { selector: "p" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Cocoa Cocoa finish/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
