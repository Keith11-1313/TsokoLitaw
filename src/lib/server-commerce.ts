import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { measureServerOperation } from "@/lib/server-observability";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { CommerceCatalog, Coating } from "@/types/commerce";
import type { CheckoutAvailability } from "@/types/pickup";

const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300;
const PICKUP_DEFINITIONS_REVALIDATE_SECONDS = 30;

const coatingTones: Record<string, Coating["tone"]> = {
  cocoa: "cocoa-coating",
  milk: "milk",
  palitaw: "palitaw",
  "crushed-nuts": "nuts",
  plain: "plain",
  "sesame-seeds": "sesame",
  "cookies-and-cream": "cookies-cream",
};

interface CatalogProductRow {
  id: string;
  name: string;
  description: string;
  price_per_piece: number | string;
  product_variants: Array<{
    id: string;
    name: string;
    piece_count: number;
    sort_order: number;
  }> | null;
}

interface PickupLocationRow {
  id: string;
  name: string;
  sort_order: number;
}

interface PickupDateRow {
  id: string;
  pickup_date: string;
  availability_mode: "MADE_TO_ORDER" | "READY_STOCK" | "HYBRID";
  pickup_windows: Array<{
    id: string;
    pickup_date_id: string;
    start_time: string;
    end_time: string;
    capacity: number | null;
    sort_order: number;
    pickup_window_locations: Array<{
      capacity_override: number | null;
      pickup_locations: PickupLocationRow | null;
    }> | null;
  }> | null;
}

function asMoney(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("The commerce catalog contains an invalid price.");
  }
  return amount;
}

function isSupportedPieceCount(value: number): value is 4 | 6 | 8 {
  return value === 4 || value === 6 || value === 8;
}

async function loadCommerceCatalog(): Promise<CommerceCatalog> {
  const supabase = createPublicSupabaseClient();
  const [productResult, coatingsResult, addonsResult] = await measureServerOperation(
    "commerce.catalog",
    () => Promise.all([
      supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price_per_piece,
          product_variants (
            id,
            name,
            piece_count,
            sort_order
          )
        `)
        .eq("is_active", true)
        .eq("product_variants.is_active", true)
        .order("created_at", { ascending: true })
        .order("sort_order", { referencedTable: "product_variants", ascending: true })
        .limit(1)
        .maybeSingle(),
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
    ]),
  );

  if (productResult.error || !productResult.data) {
    throw new Error("The active TsokoLitaw product could not be loaded.", {
      cause: productResult.error,
    });
  }
  if (coatingsResult.error || addonsResult.error) {
    throw new Error("The active commerce catalog could not be loaded.", {
      cause: coatingsResult.error ?? addonsResult.error,
    });
  }

  const product = productResult.data as unknown as CatalogProductRow;
  const piecePrice = asMoney(product.price_per_piece);
  const variants = (product.product_variants ?? [])
    .sort((left, right) => left.sort_order - right.sort_order)
    .flatMap((variant): CommerceCatalog["variants"][number][] => {
      const pieceCount = variant.piece_count;
      if (!isSupportedPieceCount(pieceCount)) {
        return [];
      }

      return [{
        id: variant.id,
        label: variant.name,
        pieceCount,
        price: pieceCount * piecePrice,
      }];
    });
  const coatings = (coatingsResult.data ?? []).map((coating) => ({
    id: coating.id,
    name: coating.name,
    description: coating.description,
    imageSrc: coating.image_url ?? "/brand/logo.png",
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
}

// Checkout calls this request-scoped version so prices are always reloaded.
export const getCommerceCatalog = cache(loadCommerceCatalog);

// Public browsing can safely reuse a tagged snapshot between requests.
export const getPublicCommerceCatalog = unstable_cache(
  loadCommerceCatalog,
  ["public-commerce-catalog-v1"],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: ["commerce-catalog"],
  },
);

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

async function loadCheckoutAvailability(): Promise<CheckoutAvailability> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await measureServerOperation("commerce.pickup-definitions", () => supabase
    .from("pickup_dates")
    .select(`
      id,
      pickup_date,
      availability_mode,
      pickup_windows (
        id,
        pickup_date_id,
        start_time,
        end_time,
        capacity,
        sort_order,
        pickup_window_locations (
          capacity_override,
          pickup_locations (
            id,
            name,
            sort_order
          )
        )
      )
    `)
    .eq("is_open", true)
    .gte("pickup_date", getManilaDate())
    .order("pickup_date", { ascending: true })
    .order("sort_order", { referencedTable: "pickup_windows", ascending: true }));

  if (error) {
    throw new Error("Pickup availability could not be loaded.", { cause: error });
  }

  const dates = (data ?? []) as unknown as PickupDateRow[];
  const checkoutDates = dates.flatMap((date) => {
    const checkoutWindows = (date.pickup_windows ?? [])
      .filter((window) => window.capacity === null || window.capacity > 0)
      .sort((left, right) => left.sort_order - right.sort_order)
      .flatMap((window) => {
        const locations = (window.pickup_window_locations ?? [])
          .filter((entry) => entry.capacity_override === null || entry.capacity_override > 0)
          .flatMap((entry) => entry.pickup_locations ? [entry.pickup_locations] : [])
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((location) => ({ id: location.id, name: location.name }));

        if (!locations.length) return [];
        return [{
          id: window.id,
          dateId: date.id,
          label: `${formatPickupTime(window.start_time)}–${formatPickupTime(window.end_time)}`,
          locations,
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
}

export const getCheckoutAvailability = unstable_cache(
  loadCheckoutAvailability,
  ["public-pickup-definitions-v1"],
  {
    revalidate: PICKUP_DEFINITIONS_REVALIDATE_SECONDS,
    tags: ["pickup-definitions"],
  },
);
