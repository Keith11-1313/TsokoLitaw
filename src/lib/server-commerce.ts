import "server-only";

import { cache } from "react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CommerceCatalog, Coating } from "@/types/commerce";
import type { CheckoutAvailability } from "@/types/pickup";

const coatingTones: Record<string, Coating["tone"]> = {
  cocoa: "cocoa-coating",
  milk: "milk",
  palitaw: "palitaw",
  "crushed-nuts": "nuts",
  plain: "plain",
  "sesame-seeds": "sesame",
  "cookies-and-cream": "cookies-cream",
};

function asMoney(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("The commerce catalog contains an invalid price.");
  }
  return amount;
}

export const getCommerceCatalog = cache(async (): Promise<CommerceCatalog> => {
  const supabase = await createServerSupabaseClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, description, price_per_piece")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (productError || !product) {
    throw new Error("The active TsokoLitaw product could not be loaded.", {
      cause: productError,
    });
  }

  const [variantsResult, coatingsResult, addonsResult] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, name, piece_count")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("coatings")
      .select("id, name, slug, description, image_url, additional_type_price")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("addons")
      .select("id, name, slug, price")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  if (variantsResult.error || coatingsResult.error || addonsResult.error) {
    throw new Error("The active commerce catalog could not be loaded.", {
      cause: variantsResult.error ?? coatingsResult.error ?? addonsResult.error,
    });
  }

  const piecePrice = asMoney(product.price_per_piece);
  const variants = (variantsResult.data ?? []).flatMap((variant) => {
    if (variant.piece_count !== 4 && variant.piece_count !== 6 && variant.piece_count !== 8) {
      return [];
    }

    return [{
      id: variant.id,
      label: variant.name,
      pieceCount: variant.piece_count,
      price: variant.piece_count * piecePrice,
    }];
  });
  const coatings = (coatingsResult.data ?? []).map((coating) => ({
    id: coating.id,
    name: coating.name,
    description: coating.description,
    imageSrc: coating.image_url ?? "/images/products/coatings/plain.jpeg",
    additionalTypePrice: asMoney(coating.additional_type_price),
    tone: coatingTones[coating.slug] ?? "plain",
  }));
  const addons = (addonsResult.data ?? []).map((addon) => ({
    id: addon.id,
    name: addon.name,
    slug: addon.slug,
    price: asMoney(addon.price),
  }));

  if (!variants.length || !coatings.length) {
    throw new Error("The active commerce catalog is incomplete.");
  }

  return {
    productId: product.id,
    productName: product.name,
    productDescription: product.description,
    piecePrice,
    variants,
    coatings,
    addons,
  };
});

function getManilaDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatPickupDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatPickupTime(value: string) {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

export const getCheckoutAvailability = cache(async (): Promise<CheckoutAvailability> => {
  const supabase = createAdminSupabaseClient();
  const { data: dates, error: datesError } = await supabase
    .from("pickup_dates")
    .select("id, pickup_date, availability_mode")
    .eq("is_open", true)
    .gte("pickup_date", getManilaDate())
    .order("pickup_date", { ascending: true });

  if (datesError) {
    throw new Error("Pickup dates could not be loaded.", { cause: datesError });
  }

  const dateIds = (dates ?? []).map((date) => date.id);
  if (!dateIds.length) {
    return {
      dates: [],
      graceMinutes: 15,
      operatingDays: "Monday–Saturday",
      operatingHours: "7:00 AM–7:00 PM",
    };
  }

  const { data: windows, error: windowsError } = await supabase
    .from("pickup_windows")
    .select("id, pickup_date_id, start_time, end_time, capacity")
    .in("pickup_date_id", dateIds)
    .eq("is_open", true)
    .or("capacity.is.null,capacity.gt.0")
    .order("sort_order", { ascending: true });

  if (windowsError) {
    throw new Error("Pickup windows could not be loaded.", { cause: windowsError });
  }

  const windowIds = (windows ?? []).map((window) => window.id);
  const junctionResult = windowIds.length
    ? await supabase
      .from("pickup_window_locations")
      .select("pickup_window_id, pickup_location_id, capacity_override")
      .in("pickup_window_id", windowIds)
      .eq("is_open", true)
      .or("capacity_override.is.null,capacity_override.gt.0")
    : { data: [], error: null };

  if (junctionResult.error) {
    throw new Error("Pickup locations could not be loaded.", {
      cause: junctionResult.error,
    });
  }

  const locationIds = [...new Set(
    (junctionResult.data ?? []).map((entry) => entry.pickup_location_id),
  )];
  const locationsResult = locationIds.length
    ? await supabase
      .from("pickup_locations")
      .select("id, name, sort_order")
      .in("id", locationIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (locationsResult.error) {
    throw new Error("Pickup locations could not be loaded.", {
      cause: locationsResult.error,
    });
  }

  const locationsById = new Map(
    (locationsResult.data ?? []).map((location) => [location.id, location]),
  );
  const junctionsByWindow = new Map<string, typeof junctionResult.data>();
  for (const junction of junctionResult.data ?? []) {
    const entries = junctionsByWindow.get(junction.pickup_window_id) ?? [];
    entries.push(junction);
    junctionsByWindow.set(junction.pickup_window_id, entries);
  }

  const checkoutDates = (dates ?? []).flatMap((date) => {
    const checkoutWindows = (windows ?? [])
      .filter((window) => window.pickup_date_id === date.id)
      .flatMap((window) => {
        const availableLocations = (junctionsByWindow.get(window.id) ?? [])
          .map((entry) => locationsById.get(entry.pickup_location_id))
          .filter((location): location is NonNullable<typeof location> => Boolean(location))
          .map((location) => ({ id: location.id, name: location.name }));

        if (!availableLocations.length) return [];
        return [{
          id: window.id,
          dateId: date.id,
          label: `${formatPickupTime(window.start_time)}–${formatPickupTime(window.end_time)}`,
          locations: availableLocations,
        }];
      });

    if (!checkoutWindows.length) return [];
    return [{
      id: date.id,
      value: date.pickup_date,
      label: formatPickupDate(date.pickup_date),
      availabilityMode: date.availability_mode,
      windows: checkoutWindows,
    }];
  });

  return {
    dates: checkoutDates,
    graceMinutes: 15,
    operatingDays: "Monday–Saturday",
    operatingHours: "7:00 AM–7:00 PM",
  };
});
