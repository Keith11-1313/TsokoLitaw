"use client";
import type { Database } from "@/types/database";

import { createBrowserClient } from "@supabase/ssr";
import { entityIdFetch } from "./entity-id-fetch";
import { getSupabasePublicEnvironment } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicEnvironment();
  return createBrowserClient<Database>(url, publishableKey, { global: { fetch: entityIdFetch } });
}
