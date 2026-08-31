import { describe, expect, it } from "vitest";
import {
  imageFileError,
  integerError,
  numberError,
  secureUrlError,
  textError,
} from "./form-validation";

describe("form validation", () => {
  it("validates trimmed text boundaries", () => {
    expect(textError(" a ", "Name", 2, 10)).toContain("at least 2");
    expect(textError(" valid ", "Name", 2, 10)).toBe("");
  });

  it("rejects invalid numeric ranges, steps, and integers", () => {
    expect(numberError(10.005, "Price", 0, 10000, 0.01)).toContain("increments");
    expect(numberError(10.25, "Price", 0, 10000, 0.01)).toBe("");
    expect(integerError(1.5, "Quantity", 1, 10)).not.toBe("");
    expect(integerError(4, "Quantity", 1, 10)).toBe("");
  });

  it("requires secure URLs", () => {
    expect(secureUrlError("http://example.com", "Video link")).toContain("https://");
    expect(secureUrlError("https://example.com/watch", "Video link")).toBe("");
  });

  it("rejects the supplied image size before decoding", () => {
    const oversized = new File([new Uint8Array(5_243_895)], "plain.jpg", { type: "image/jpeg" });
    expect(imageFileError(oversized)).toContain("5.00 MB");
    expect(imageFileError(oversized)).toContain("3 MB");
  });
});
