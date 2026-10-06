// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CustomerAvatar } from "./customer-avatar";

afterEach(cleanup);
it("keeps the person icon when no photo is available", () => {
  const { container } = render(<CustomerAvatar avatarUrl={null} />);
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("svg")).not.toBeNull();
});
it("falls back on image failure and retries a different photo", () => {
  const { container, rerender } = render(
    <CustomerAvatar avatarUrl="https://lh3.googleusercontent.com/a" />,
  );
  const image = container.querySelector("img")!;
  expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
  fireEvent.error(image);
  expect(container.querySelector("img")).toBeNull();
  rerender(<CustomerAvatar avatarUrl="https://lh3.googleusercontent.com/b" />);
  expect(container.querySelector("img")).not.toBeNull();
});
