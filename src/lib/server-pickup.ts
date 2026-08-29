import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PickupMode = "MADE_TO_ORDER" | "READY_STOCK" | "HYBRID";

export interface AdminPickupLocation {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface AdminPickupWindow {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  locationIds: string[];
  bookedBoxes: number;
}

export interface AdminPickupDate {
  id: string;
  pickupDate: string;
  availabilityMode: PickupMode;
  isOpen: boolean;
  notes: string;
  windows: AdminPickupWindow[];
  isLocked: boolean;
}

export interface AdminPickupSettings {
  minimumLeadDays: number;
  dailyCutoffTime: string;
  graceMinutes: number;
  defaultCapacity: number;
  operatingStart: string;
  operatingEnd: string;
}

interface PickupDateRow {
  id: string;
  pickup_date: string;
  availability_mode: PickupMode;
  is_open: boolean;
  notes: string | null;
  pickup_windows: Array<{
    id: string;
    start_time: string;
    end_time: string;
    capacity: number | null;
    sort_order: number;
    pickup_window_locations: Array<{ pickup_location_id: string }> | null;
  }> | null;
}

function manilaDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function settingValue(rows: Array<{ key: string; value: unknown }>, key: string, fallback: unknown) {
  return rows.find((row) => row.key === key)?.value ?? fallback;
}

export async function getAdminPickup() {
  const supabase = await createServerSupabaseClient();
  const [datesResult, locationsResult, settingsResult, inventoryResult, ordersResult] = await Promise.all([
    supabase.from("pickup_dates").select(`
      id,pickup_date,availability_mode,is_open,notes,
      pickup_windows(id,start_time,end_time,capacity,sort_order,pickup_window_locations(pickup_location_id))
    `).gte("pickup_date", manilaDate()).order("pickup_date"),
    supabase.from("pickup_locations").select("id,name,description,is_active,sort_order").order("sort_order"),
    supabase.from("business_settings").select("key,value").in("key", [
      "minimum_lead_days", "daily_cutoff_time", "pickup_grace_minutes",
      "default_pickup_capacity", "pickup_operating_hours",
    ]),
    supabase.from("daily_inventory").select("pickup_date"),
    supabase.from("orders").select("pickup_window_id,status,order_items(quantity)"),
  ]);

  const error = datesResult.error ?? locationsResult.error ?? settingsResult.error
    ?? inventoryResult.error ?? ordersResult.error;
  if (error) throw new Error("Pickup management could not be loaded.", { cause: error });

  const locations: AdminPickupLocation[] = (locationsResult.data ?? []).map((location) => ({
    id: location.id, name: location.name, description: location.description ?? "", isActive: location.is_active,
  }));
  const inventoryDates = new Set((inventoryResult.data ?? []).map((row) => row.pickup_date));
  const bookedByWindow = new Map<string, number>();
  for (const order of ordersResult.data ?? []) {
    if (!order.pickup_window_id || order.status === "CANCELLED" || order.status === "EXPIRED") continue;
    const boxes = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    bookedByWindow.set(order.pickup_window_id, (bookedByWindow.get(order.pickup_window_id) ?? 0) + boxes);
  }

  const dates: AdminPickupDate[] = ((datesResult.data ?? []) as unknown as PickupDateRow[]).map((date) => {
    const windows = (date.pickup_windows ?? []).sort((a, b) => a.sort_order - b.sort_order).map((window) => ({
      id: window.id,
      startTime: window.start_time.slice(0, 5),
      endTime: window.end_time.slice(0, 5),
      capacity: window.capacity ?? 20,
      locationIds: (window.pickup_window_locations ?? []).map((entry) => entry.pickup_location_id),
      bookedBoxes: bookedByWindow.get(window.id) ?? 0,
    }));
    return {
      id: date.id, pickupDate: date.pickup_date, availabilityMode: date.availability_mode,
      isOpen: date.is_open, notes: date.notes ?? "", windows,
      isLocked: inventoryDates.has(date.pickup_date) || windows.some((window) => window.bookedBoxes > 0),
    };
  });

  const settingRows = (settingsResult.data ?? []) as Array<{ key: string; value: unknown }>;
  const hours = settingValue(settingRows, "pickup_operating_hours", { start: "07:00", end: "19:00" }) as { start?: string; end?: string };
  const settings: AdminPickupSettings = {
    minimumLeadDays: Number(settingValue(settingRows, "minimum_lead_days", 1)),
    dailyCutoffTime: String(settingValue(settingRows, "daily_cutoff_time", "17:00")),
    graceMinutes: Number(settingValue(settingRows, "pickup_grace_minutes", 15)),
    defaultCapacity: Number(settingValue(settingRows, "default_pickup_capacity", 20)),
    operatingStart: hours.start ?? "07:00",
    operatingEnd: hours.end ?? "19:00",
  };

  return { dates, locations, settings };
}

export async function savePickupSchedule(input: {
  adminId: string;
  pickupDateId: string | null;
  pickupDate: string;
  availabilityMode: PickupMode;
  isOpen: boolean;
  notes: string;
  windows: Array<{ startTime: string; endTime: string; capacity: number; locationIds: string[] }>;
}) {
  const { error } = await createAdminSupabaseClient().rpc("upsert_pickup_schedule", {
    target_admin_id: input.adminId,
    target_pickup_date_id: input.pickupDateId,
    pickup_date_value: input.pickupDate,
    availability_mode_value: input.availabilityMode,
    open_value: input.isOpen,
    notes_value: input.notes,
    windows_value: input.windows.map((window) => ({
      start_time: window.startTime, end_time: window.endTime,
      capacity: window.capacity, location_ids: window.locationIds,
    })),
  });
  if (error) throw new Error(error.message || "Pickup schedule could not be saved.", { cause: error });
}

export async function setPickupDateOpen(input: { adminId: string; pickupDateId: string; isOpen: boolean }) {
  const { error } = await createAdminSupabaseClient().rpc("set_pickup_date_open", {
    target_admin_id: input.adminId, target_pickup_date_id: input.pickupDateId, open_value: input.isOpen,
  });
  if (error) throw new Error(error.message || "Pickup date visibility could not be changed.", { cause: error });
}

export async function savePickupSettings(input: { adminId: string; settings: AdminPickupSettings }) {
  const { error } = await createAdminSupabaseClient().rpc("update_pickup_settings", {
    target_admin_id: input.adminId,
    minimum_lead_days_value: input.settings.minimumLeadDays,
    daily_cutoff_time_value: input.settings.dailyCutoffTime,
    grace_minutes_value: input.settings.graceMinutes,
    default_capacity_value: input.settings.defaultCapacity,
    operating_start_value: input.settings.operatingStart,
    operating_end_value: input.settings.operatingEnd,
  });
  if (error) throw new Error(error.message || "Pickup rules could not be saved.", { cause: error });
}

export async function savePickupLocation(input: {
  adminId: string;
  locationId: string | null;
  name: string;
  description: string;
  isActive: boolean;
}) {
  const { error } = await createAdminSupabaseClient().rpc("upsert_pickup_location", {
    target_admin_id: input.adminId,
    target_location_id: input.locationId,
    name_value: input.name,
    description_value: input.description,
    active_value: input.isActive,
  });
  if (error) throw new Error(error.message || "Pickup location could not be saved.", { cause: error });
}
