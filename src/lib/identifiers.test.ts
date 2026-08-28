import { describe, expect, it } from "vitest";
import { isUuid } from "./identifiers";

describe("UUID validation", () => {
  it("accepts PostgreSQL-generated UUIDs", () => {
    expect(isUuid("46c47028-e8a3-4436-8a27-ca70a78e26f7")).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(isUuid("TL-0001")).toBe(false);
    expect(isUuid("46c47028-e8a3-4436-ca70a78e26f7")).toBe(false);
  });
});
