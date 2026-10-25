import "server-only";
import type { Database } from "@/types/database";

import { createClient } from "@supabase/supabase-js";
import { entityIdFetch } from "./entity-id-fetch";
import { getSupabasePublicEnvironment, getSupabaseSecretKey } from "@/lib/supabase/env";

export function createAdminSupabaseClient() {
  const { url } = getSupabasePublicEnvironment();

  return createClient<Database>(url, getSupabaseSecretKey(), {
    global: { fetch: entityIdFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
