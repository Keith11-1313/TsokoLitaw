import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePickupSettingsAction } from "./actions";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: "admin-id" })),
  save: vi.fn(async () => {}),
  rateLimit: vi.fn(async () => {}),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/server-pickup", () => ({ savePickupSettings: mocks.save }));
vi.mock("@/lib/server-rate-limit", () => ({
  enforceMutationRateLimit: mocks.rateLimit,
  MutationRateLimitError: class extends Error {},
}));
const idle = { status: "idle" as const, message: "" };
function form(times = ["17:00:00", "07:00:00", "19:00:00"]) {
  const data = new FormData();
  data.set("minimumLeadDays", "1");
  ["dailyCutoffTime", "operatingStart", "operatingEnd"].forEach((key, index) =>
    data.set(key, times[index]),
  );
  return data;
}
beforeEach(() => vi.clearAllMocks());
describe("pickup rules save", () => {
  it.each([
    ["17:00:00", "07:00:00", "19:00:00"],
    ["17:00", "07:00", "19:00"],
  ])("saves changed lead days with time values %s %s %s", async (...times) => {
    expect((await savePickupSettingsAction(idle, form(times))).status).toBe("success");
    expect(mocks.requireAdmin).toHaveBeenCalledWith("/admin/pickup");
    expect(mocks.rateLimit).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith({
      adminId: "admin-id",
      settings: {
        minimumLeadDays: 1,
        dailyCutoffTime: "17:00",
        operatingStart: "07:00",
        operatingEnd: "19:00",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/checkout");
  });
  it.each(["25:00:00", "17:60:00", "17:00:30", "17:00junk", ""])(
    "rejects invalid cutoff %s without writing",
    async (time) => {
      const result = await savePickupSettingsAction(idle, form([time, "07:00:00", "19:00:00"]));
      expect(result.status).toBe("error");
      expect(result.fieldErrors?.dailyCutoffTime).toBeTruthy();
      expect(mocks.save).not.toHaveBeenCalled();
      expect(mocks.rateLimit).not.toHaveBeenCalled();
    },
  );
  it("retains the operating-hours ordering check", async () => {
    const result = await savePickupSettingsAction(idle, form(["17:00:00", "19:00:00", "07:00:00"]));
    expect(result.fieldErrors?.operatingEnd).toBe("Operating end must be after the start.");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects invalid lead days", async () => {
    const data = form();
    data.set("minimumLeadDays", "1.5");
    expect((await savePickupSettingsAction(idle, data)).fieldErrors?.minimumLeadDays).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not write when Admin authorization fails", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(savePickupSettingsAction(idle, form())).rejects.toThrow("Unauthorized");
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
