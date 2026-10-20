// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CommunityReviews } from "./community-reviews";
afterEach(cleanup);
const review = {
  id: "review",
  customerName: "Al**",
  rating: 5,
  comment: "Soft and delicious.",
  highlights: [],
  imageCount: 0,
  reviewedAt: "2026-10-21T00:00:00Z",
  orderedItems: [{ name: "TsokoMini (4 pcs)", quantity: 1, pieceCount: 4 }],
};
it("uses text-first compact cards without the nested ordered panel", () => {
  const { container } = render(
    <CommunityReviews reviews={[review]} totalCount={1} page={1} pageSize={12} />,
  );
  expect(screen.getByText("Soft and delicious.")).toBeTruthy();
  expect(container.querySelector("blockquote")?.className).toContain("p-4");
  expect(container.querySelector("blockquote .bg-surface-muted")).toBeNull();
  expect(screen.queryByRole("navigation")).toBeNull();
});
it("makes later reviews reachable instead of imposing a total ceiling", () => {
  render(<CommunityReviews reviews={[review]} totalCount={25} page={2} pageSize={12} />);
  expect(screen.getByRole("link", { name: "Next review page" }).getAttribute("href")).toBe(
    "/journal?reviewsPage=3#community-reviews",
  );
  expect(screen.getByRole("link", { name: "Previous review page" }).getAttribute("href")).toBe(
    "/journal?reviewsPage=1#community-reviews",
  );
  expect(screen.getByText("25 reviews")).toBeTruthy();
});
