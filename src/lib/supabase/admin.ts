import { createClient } from "@supabase/supabase-js";
import { serverEnv, publicEnv } from "@/lib/config/env";

/**
 * Creates a Supabase client with the service role key.
 * Used for background tasks, webhooks, and administrative operations
 * that need to bypass RLS.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = serverEnv.supabaseServiceRoleKey;

  if (!serviceRoleKey || serviceRoleKey.startsWith("MISSING_")) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY). Set it in your deployment env (e.g. Vercel) or .env.local.",
    );
  }

  const url = publicEnv.supabaseUrl;
  if (!url || url.includes("MISSING")) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or equivalent). Cannot create Supabase admin client.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
