import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("public search metadata", () => {
  it("allows the FAQ while keeping private routes out of search", () => {
    const rules = robots().rules;
    expect(rules).toEqual(
      expect.objectContaining({
        allow: expect.arrayContaining(["/faq"]),
        disallow: expect.arrayContaining(["/admin/", "/orders/", "/checkout"]),
      }),
    );
  });

  it("lists canonical public pages without a fabricated modification date", () => {
    const entries = sitemap();
    expect(entries.map(({ url }) => url)).toEqual([
      "https://www.tsokolitaw.com/",
      "https://www.tsokolitaw.com/our-creations",
      "https://www.tsokolitaw.com/journal",
      "https://www.tsokolitaw.com/faq",
      "https://www.tsokolitaw.com/terms",
      "https://www.tsokolitaw.com/privacy",
    ]);
    expect(entries.every(({ lastModified }) => lastModified === undefined)).toBe(true);
  });
});
