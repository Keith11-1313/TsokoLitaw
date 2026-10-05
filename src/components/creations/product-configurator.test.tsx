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
  it("lets Admins browse prices but prevents adding a box", async () => {
    const user = userEvent.setup();
    render(<ProductConfigurator catalog={catalog} canOrder={false} />);
    const button = screen.getByRole("button", {
      name: "Customer accounts only",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull();
    await user.click(button);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("selects a mobile coating and updates the price", async () => {
    const user = userEvent.setup();
    render(<ProductConfigurator catalog={catalog} />);

    await user.click(screen.getByRole("radio", { name: "Cocoa" }));
    expect((screen.getByRole("radio", { name: "Cocoa" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("₱60.00")).toBeTruthy();

    expect(screen.getByText("Cocoa", { selector: "p" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Cocoa.*Cocoa finish/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("requires a full mixed allocation and prevents adding excess pieces", async () => {
    const user = userEvent.setup();
    render(<ProductConfigurator catalog={catalog} />);
    await user.click(screen.getByRole("button", { name: "Mixed" }));
    const addToCart = screen.getByRole("button", { name: "Add to cart" }) as HTMLButtonElement;
    expect(addToCart.disabled).toBe(true);
    const increase = screen.getByRole("button", {
      name: "Increase Cocoa pieces",
    }) as HTMLButtonElement;
    for (let i = 0; i < 4; i++) await user.click(increase);
    expect(addToCart.disabled).toBe(false);
    expect(increase.disabled).toBe(true);
    expect(screen.getByText("₱60.00")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Decrease Cocoa pieces" }));
    expect(addToCart.disabled).toBe(true);
  });
});

describe("builder extras and allergen notice", () => {
  it("shows add-on quantity only for a selected add-on and places allergens after box quantity", async () => {
    const user = userEvent.setup();
    render(<ProductConfigurator catalog={catalog} />);

    expect(screen.queryByRole("spinbutton", { name: "Qty. per box" })).toBeNull();
    const boxQuantity = screen.getByRole("spinbutton", { name: "Box quantity" });
    const allergenNotice = screen.getByText(/Allergen notice:/);
    expect(
      boxQuantity.compareDocumentPosition(allergenNotice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(screen.getByRole("combobox", { name: "Add-on" }));
    await user.click(screen.getByRole("option", { name: "Sea salt cream" }));
    expect(screen.getByRole("spinbutton", { name: "Qty. per box" })).toBeTruthy();

    await user.click(screen.getByRole("combobox", { name: "Add-on" }));
    await user.click(screen.getByRole("option", { name: "No additional extra" }));
    expect(screen.queryByRole("spinbutton", { name: "Qty. per box" })).toBeNull();
  });
});
