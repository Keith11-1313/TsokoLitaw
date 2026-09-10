import "server-only";
import type { Database } from "@/types/database";

import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicEnvironment,
  getSupabaseSecretKey,
} from "@/lib/supabase/env";

export function createAdminSupabaseClient() {
  const { url } = getSupabasePublicEnvironment();

  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
