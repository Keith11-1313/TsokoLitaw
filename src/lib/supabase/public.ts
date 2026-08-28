import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnvironment } from "@/lib/supabase/env";

export function createPublicSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicEnvironment();

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
