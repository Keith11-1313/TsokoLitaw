// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminStatCard } from "@/components/admin/admin-stat-card";

describe("AdminStatCard", () => {
  it("keeps compact cards content-sized on mobile", () => {
    render(<AdminStatCard compact label="Active coatings" value="7" />);

    const card = screen.getByRole("article");

    expect(card.className.split(" ")).not.toContain("min-h-[6.25rem]");
    expect(card.className.split(" ")).toEqual(
      expect.arrayContaining(["py-3", "sm:min-h-[6.25rem]", "sm:py-4"]),
    );
  });
});
