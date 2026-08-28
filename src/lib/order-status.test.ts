import { describe, expect, it } from "vitest";
import {
  getNextFulfillmentStatus,
  isAllowedFulfillmentTransition,
} from "./order-status";

describe("order fulfillment transitions", () => {
  it("allows only the forward operational path", () => {
    expect(getNextFulfillmentStatus("CONFIRMED")).toBe("PREPARING");
    expect(getNextFulfillmentStatus("PREPARING")).toBe("READY_FOR_PICKUP");
    expect(getNextFulfillmentStatus("READY_FOR_PICKUP")).toBe("COMPLETED");
  });

  it("does not expose actions for payment or terminal statuses", () => {
    expect(getNextFulfillmentStatus("PENDING_PAYMENT")).toBeNull();
    expect(getNextFulfillmentStatus("COMPLETED")).toBeNull();
    expect(getNextFulfillmentStatus("CANCELLED")).toBeNull();
    expect(getNextFulfillmentStatus("EXPIRED")).toBeNull();
  });

  it("rejects skipped and backward transitions", () => {
    expect(isAllowedFulfillmentTransition("CONFIRMED", "READY_FOR_PICKUP")).toBe(false);
    expect(isAllowedFulfillmentTransition("COMPLETED", "PREPARING")).toBe(false);
  });
});
