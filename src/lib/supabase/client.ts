import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/config/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
