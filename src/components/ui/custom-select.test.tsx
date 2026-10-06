// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CustomSelect } from "./custom-select";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const options = [
  { value: "a", label: "First" },
  { value: "b", label: "Second" },
];

function mockBounds(top: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const y = top + (this.tagName === "BUTTON" ? 28 : 0);
    return {
      top: y,
      bottom: y + 48,
      left: 0,
      right: 200,
      width: 200,
      height: 48,
      x: 0,
      y,
      toJSON: () => ({}),
    };
  });
}

it("opens below the trigger without covering its label", () => {
  mockBounds(100);
  render(<CustomSelect label="Choose" options={options} />);
  fireEvent.click(screen.getByRole("combobox"));
  expect(screen.getByRole("listbox").style.top).toBe("80px");
  expect(screen.getByRole("listbox").style.transform).toBe("");
});

it("opens above the entire labeled control near the viewport bottom", () => {
  mockBounds(window.innerHeight - 80);
  render(<CustomSelect label="Choose" options={options} />);
  fireEvent.click(screen.getByRole("combobox"));
  expect(screen.getByRole("listbox").style.top).toBe("-4px");
  expect(screen.getByRole("listbox").style.transform).toBe("translateY(-100%)");
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
});

it("keeps an accessible name when its visual label is hidden", () => {
  render(<CustomSelect label="Pickup date" hideLabel options={options} />);
  expect(screen.getByRole("combobox", { name: "Pickup date" })).toBeTruthy();
  expect(screen.getByText("Pickup date").className).toBe("sr-only");
});
