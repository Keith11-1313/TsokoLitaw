import "server-only";
import type { Database } from "@/types/database";

import { createClient } from "@supabase/supabase-js";
import { entityIdFetch } from "./entity-id-fetch";
import { getSupabasePublicEnvironment } from "@/lib/supabase/env";

export function createPublicSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicEnvironment();

  return createClient<Database>(url, publishableKey, {
    global: { fetch: entityIdFetch },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
