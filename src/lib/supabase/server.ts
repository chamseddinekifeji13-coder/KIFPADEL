import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/config/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              path: "/",
            });
          });
        } catch {
          // Server Components may not allow cookie writes.
          // This is safe to ignore for read-only rendering paths.
        }
      },
    },
  });
}

// Alias for backward compatibility
export const createSupabaseServerClient = createClient;
