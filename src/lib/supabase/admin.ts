import { createClient } from "@supabase/supabase-js";
import { serverEnv, publicEnv } from "@/lib/config/env";

/**
 * Creates a Supabase client with the service role key.
 * Used for background tasks, webhooks, and administrative operations
 * that need to bypass RLS.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = serverEnv.supabaseServiceRoleKey;

  return createClient(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
