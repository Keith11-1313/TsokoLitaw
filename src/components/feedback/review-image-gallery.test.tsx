// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewImageGallery } from "./review-image-gallery";

afterEach(cleanup);

describe("ReviewImageGallery", () => {
  it("loads private review media directly through the authorized application route", () => {
    const reviewId = "b6034c17-17cf-4833-90cf-3804a345048f";

    render(<ReviewImageGallery reviewId={reviewId} imageCount={1} />);

    const source = screen
      .getByRole("img", { name: "Customer review image 1 of 1" })
      .getAttribute("src");
    expect(source).toContain(`/api/review-images/${reviewId}?index=0`);
    expect(source).not.toContain("/_next/image");
    expect(screen.getByRole("img", { name: "Customer review image 1 of 1" }).className).toContain(
      "object-contain",
    );
  });

  it("moves through multiple review images with explicit controls", () => {
    render(<ReviewImageGallery reviewId="review-id" imageCount={3} />);

    expect(screen.getByText("Image 1 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next review image" }));
    expect(screen.getByRole("img", { name: "Customer review image 2 of 3" })).toBeTruthy();
    expect(screen.getByText("Image 2 of 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous review image" }));
    expect(screen.getByRole("img", { name: "Customer review image 1 of 3" })).toBeTruthy();
  });

  it("opens the full image and closes it", () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    render(<ReviewImageGallery reviewId="review-id" imageCount={1} />);

    fireEvent.click(screen.getByRole("button", { name: "View review image 1 full screen" }));
    const dialog = screen.getByRole("dialog", { name: "Review image 1 of 1" });
    expect(dialog.className).toContain("bg-surface");
    expect(screen.getByText("Community photo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close full-screen review image" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
