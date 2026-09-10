// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CustomerHeaderFrame } from "./customer-header-frame";

afterEach(cleanup);

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value });
  fireEvent.scroll(window);
}

describe("CustomerHeaderFrame", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("stays visible during a small downward scroll", () => {
    render(<CustomerHeaderFrame>Navigation</CustomerHeaderFrame>);

    setScrollY(40);

    expect(screen.getByRole("banner").getAttribute("data-scroll-state")).toBe("visible");
  });

  it("hides after continued downward scrolling and returns on upward scrolling", () => {
    render(<CustomerHeaderFrame>Navigation</CustomerHeaderFrame>);

    setScrollY(80);
    setScrollY(145);
    expect(screen.getByRole("banner").getAttribute("data-scroll-state")).toBe("hidden");

    setScrollY(140);
    expect(screen.getByRole("banner").getAttribute("data-scroll-state")).toBe("visible");
  });

  it("closes an open mobile menu before hiding", () => {
    const { container } = render(
      <CustomerHeaderFrame>
        <details open>
          <summary>Menu</summary>
        </details>
      </CustomerHeaderFrame>,
    );

    setScrollY(70);
    setScrollY(140);

    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
  });
});
