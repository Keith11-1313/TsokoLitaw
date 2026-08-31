"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import {
  savePickupLocation, savePickupSchedule, savePickupSettings, setPickupDateOpen,
  type AdminPickupSettings, type PickupMode,
} from "@/lib/server-pickup";
import { enforceMutationRateLimit, MutationRateLimitError } from "@/lib/server-rate-limit";

export type PickupActionState = { status: "idle" | "success" | "error"; message: string; fieldErrors?: Record<string, string> };
const modes = new Set<PickupMode>(["MADE_TO_ORDER", "READY_STOCK", "HYBRID"]);

function refreshPickup() {
  revalidateTag("pickup-definitions", "max");
  revalidatePath("/admin/pickup");
  revalidatePath("/admin/inventory");
  revalidatePath("/checkout");
}

function failure(error: unknown, fallback: string): PickupActionState {
  return { status: "error", message: error instanceof MutationRateLimitError
    ? `Too many pickup updates. Try again in about ${error.retryAfterSeconds} seconds.`
    : error instanceof Error ? error.message : fallback };
}

async function guard(adminId: string) {
  await enforceMutationRateLimit({ scope: "admin-pickup-save", userId: adminId, maximumRequests: 30, windowSeconds: 300 });
}

export async function savePickupScheduleAction(
  _state: PickupActionState,
  formData: FormData,
): Promise<PickupActionState> {
  const admin = await requireAdmin("/admin/pickup");
  const idValue = String(formData.get("pickupDateId") ?? "").trim();
  const pickupDate = String(formData.get("pickupDate") ?? "");
  const mode = String(formData.get("availabilityMode") ?? "") as PickupMode;
  const notes = String(formData.get("notes") ?? "").trim();
  let windows: Array<{ startTime: string; endTime: string; locationIds: string[] }>;
  try { windows = JSON.parse(String(formData.get("windows") ?? "[]")) as typeof windows; }
  catch { return { status: "error", message: "The pickup windows are invalid." }; }

  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if ((idValue && !isUuid(idValue)) || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)
    || !modes.has(mode) || notes.length > 500 || !Array.isArray(windows)
    || windows.length < 1 || windows.length > 12
    || windows.some((window) => !validTime(window.startTime) || !validTime(window.endTime)
      || window.endTime <= window.startTime || !Array.isArray(window.locationIds)
      || window.locationIds.length < 1 || window.locationIds.some((id) => !isUuid(id)))) {
    return { status: "error", message: "Check the date, mode, time windows, and locations.", fieldErrors: { schedule: "Use a valid date, mode, and at least one correctly ordered window with a location." } };
  }
  try {
    await guard(admin.id);
    await savePickupSchedule({ adminId: admin.id, pickupDateId: idValue || null, pickupDate,
      availabilityMode: mode, isOpen: formData.get("isOpen") === "on", notes, windows });
    refreshPickup();
    return { status: "success", message: idValue ? "Pickup schedule updated." : "Pickup date published." };
  } catch (error) { return failure(error, "Pickup schedule could not be saved."); }
}

export async function setPickupDateOpenAction(input: { pickupDateId: string; isOpen: boolean }): Promise<PickupActionState> {
  const admin = await requireAdmin("/admin/pickup");
  if (!isUuid(input.pickupDateId)) return { status: "error", message: "That pickup date is invalid." };
  try {
    await guard(admin.id);
    await setPickupDateOpen({ adminId: admin.id, ...input });
    refreshPickup();
    return { status: "success", message: input.isOpen ? "Pickup date published." : "Pickup date closed." };
  } catch (error) { return failure(error, "Pickup date visibility could not be changed."); }
}

export async function savePickupSettingsAction(
  _state: PickupActionState,
  formData: FormData,
): Promise<PickupActionState> {
  const admin = await requireAdmin("/admin/pickup");
  const minimumLeadDaysValue = String(formData.get("minimumLeadDays") ?? "").trim();
  const graceMinutesValue = String(formData.get("graceMinutes") ?? "").trim();
  const settings: AdminPickupSettings = {
    minimumLeadDays: Number(minimumLeadDaysValue),
    dailyCutoffTime: String(formData.get("dailyCutoffTime") ?? ""),
    graceMinutes: Number(graceMinutesValue),
    operatingStart: String(formData.get("operatingStart") ?? ""),
    operatingEnd: String(formData.get("operatingEnd") ?? ""),
  };
  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!minimumLeadDaysValue || !Number.isInteger(settings.minimumLeadDays) || settings.minimumLeadDays < 0 || settings.minimumLeadDays > 30
    || !validTime(settings.dailyCutoffTime) || !graceMinutesValue || !Number.isInteger(settings.graceMinutes)
    || settings.graceMinutes < 0 || settings.graceMinutes > 120
    || !validTime(settings.operatingStart) || !validTime(settings.operatingEnd)
    || settings.operatingEnd <= settings.operatingStart) {
    return { status: "error", message: "Check the lead time, cutoff, grace period, and operating hours.", fieldErrors: {
      ...(!minimumLeadDaysValue || !Number.isInteger(settings.minimumLeadDays) || settings.minimumLeadDays < 0 || settings.minimumLeadDays > 30 ? { minimumLeadDays: "Use a whole number from 0 to 30." } : {}),
      ...(!graceMinutesValue || !Number.isInteger(settings.graceMinutes) || settings.graceMinutes < 0 || settings.graceMinutes > 120 ? { graceMinutes: "Use a whole number from 0 to 120." } : {}),
      ...(settings.operatingEnd <= settings.operatingStart ? { operatingEnd: "Operating end must be after the start." } : {}),
    } };
  }
  try {
    await guard(admin.id);
    await savePickupSettings({ adminId: admin.id, settings });
    refreshPickup();
    return { status: "success", message: "Pickup rules saved." };
  } catch (error) { return failure(error, "Pickup rules could not be saved."); }
}

export async function savePickupLocationAction(
  _state: PickupActionState,
  formData: FormData,
): Promise<PickupActionState> {
  const admin = await requireAdmin("/admin/pickup");
  const idValue = String(formData.get("locationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if ((idValue && !isUuid(idValue)) || name.length < 2 || name.length > 100 || description.length > 300) {
    return { status: "error", message: "Use a 2–100 character name and a description no longer than 300 characters.", fieldErrors: {
      ...(name.length < 2 || name.length > 100 ? { name: "Use a name between 2 and 100 characters." } : {}),
      ...(description.length > 300 ? { description: "Use 300 characters or fewer." } : {}),
    } };
  }
  try {
    await guard(admin.id);
    await savePickupLocation({
      adminId: admin.id,
      locationId: idValue || null,
      name,
      description,
      isActive: formData.get("isActive") === "on",
    });
    refreshPickup();
    return { status: "success", message: idValue ? "Pickup location updated." : "Pickup location added." };
  } catch (error) { return failure(error, "Pickup location could not be saved."); }
}
