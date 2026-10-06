// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderActions } from "./header-actions";

const cartCount = vi.hoisted(() => ({ value: 2 }));

vi.mock("@/components/cart/cart-provider", () => ({
  useCart: () => ({ itemCount: cartCount.value }),
}));

vi.mock("@/components/customer/customer-navigation-link", () => ({
  CustomerNavigationLink: ({
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: ({
    className,
    menuItem,
  }: ButtonHTMLAttributes<HTMLButtonElement> & { menuItem?: boolean }) => (
    <button className={className} role={menuItem ? "menuitem" : undefined} type="button">
      Log out
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  cartCount.value = 2;
});

describe("HeaderActions", () => {
  it.each([false, true])("hides all customer actions from Admins (mobile=%s)", (mobile) => {
    render(<HeaderActions mobile={mobile} isSignedIn isAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByRole("menuitem", { name: "Admin dashboard" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Profile" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "My Orders" })).toBeNull();
    expect(screen.queryByRole("link", { name: /View cart/ })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeTruthy();
  });
  it("uses the singular accessible cart label for one item", () => {
    cartCount.value = 1;
    render(<HeaderActions isSignedIn />);

    expect(screen.getByRole("link", { name: "View cart with 1 item" })).toBeTruthy();
  });

  it("expands the signed-in account menu inside the mobile navigation", () => {
    render(<HeaderActions mobile isSignedIn isAdmin />);

    const trigger = screen.getByRole("button", { name: "Account" });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu");
    expect(menu.className).toContain("border-t");
    expect(menu.className).not.toContain("absolute");
    expect(trigger.parentElement?.parentElement?.contains(menu)).toBe(true);
    expect(screen.getByRole("menuitem", { name: "Admin dashboard" })).toBeTruthy();
  });

  it("closes the mobile account menu with Escape and returns focus", () => {
    render(<HeaderActions mobile isSignedIn />);

    const trigger = screen.getByRole("button", { name: "Account" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the account disclosure when the parent mobile navigation closes", () => {
    const { container } = render(
      <details open>
        <summary>Navigation</summary>
        <HeaderActions mobile isSignedIn />
      </details>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    const parentMenu = container.querySelector("details")!;
    parentMenu.open = false;
    fireEvent(parentMenu, new Event("toggle"));

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps the desktop account menu positioned as a dropdown", () => {
    render(<HeaderActions isSignedIn />);

    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    expect(screen.getByRole("menu").className).toContain("absolute");
  });
});
