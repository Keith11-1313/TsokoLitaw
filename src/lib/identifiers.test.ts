import { describe, expect, it } from "vitest";
import { isUuid, isEntityId } from "./identifiers";

describe("UUID validation", () => {
  it("accepts PostgreSQL-generated UUIDs", () => {
    expect(isUuid("46c47028-e8a3-4436-8a27-ca70a78e26f7")).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(isUuid("TL-0001")).toBe(false);
    expect(isUuid("46c47028-e8a3-4436-ca70a78e26f7")).toBe(false);
  });
});

describe("sequential identity validation", () => {
  it("accepts canonical positive safe decimal IDs", () => {
    for (const id of ["1", "2", "299", "9007199254740991"]) expect(isEntityId(id)).toBe(true);
  });
  it("rejects UUIDs, unsafe integers and filter grammar", () => {
    for (const id of [
      "0",
      "-1",
      "01",
      "1.0",
      "1e3",
      "9007199254740992",
      "1,2",
      "1)",
      "",
      "46c47028-e8a3-4436-8a27-ca70a78e26f7",
    ])
      expect(isEntityId(id)).toBe(false);
  });
});
