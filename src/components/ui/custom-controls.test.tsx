// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomSelect } from "@/components/ui/custom-select";
import { NumberStepper } from "@/components/ui/quantity-input";

afterEach(cleanup);

describe("NumberStepper", () => {
  it("supports buttons, direct entry, keyboard steps, and form values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<form><NumberStepper label="Quantity" name="quantity" min={1} max={3} defaultValue={2} onChange={onChange} required /></form>);
    await user.click(screen.getByRole("button", { name: "Increase Quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect((screen.getByRole("button", { name: "Increase Quantity" }) as HTMLButtonElement).disabled).toBe(true);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(new FormData(container.querySelector("form")!).get("quantity")).toBe("1");
  });

  it("does not silently accept wrong-step values", () => {
    render(<NumberStepper label="Price" name="price" min={0} max={100} step={0.01} defaultValue={5} required />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5.005" } });
    expect(input.checkValidity()).toBe(false);
  });
});

describe("CustomSelect", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta", disabled: true },
    { value: "c", label: "Cocoa" },
  ];

  it("supports keyboard selection, disabled options, hidden form values, and focus restoration", async () => {
    const user = userEvent.setup();
    const { container } = render(<form><CustomSelect label="Coating" name="coating" defaultValue="a" options={options} required /></form>);
    const button = screen.getByRole("combobox");
    button.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(new FormData(container.querySelector("form")!).get("coating")).toBe("c");
    expect(document.activeElement).toBe(button);
  });

  it("supports type-ahead matching and reports a required error after blur", async () => {
    const user = userEvent.setup();
    render(<CustomSelect label="Coating" name="coating" options={options} required />);
    const button = screen.getByRole("combobox");
    button.focus();
    await user.keyboard("c{Enter}");
    expect(button.textContent).toContain("Cocoa");
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(button);
  });
});
