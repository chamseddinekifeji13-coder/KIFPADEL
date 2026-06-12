import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { publicEnv } from "@/lib/config/env";

/**
 * Client Supabase pour routes OAuth (callback, confirm-email).
 * Attache les cookies de session à la réponse de redirection (obligatoire pour PKCE).
 */
export async function createSupabaseOAuthRouteHandlerClient(redirectUrl: URL) {
  const cookieStore = await cookies();
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const merged = { ...options, path: "/" };
          try {
            cookieStore.set(name, value, merged);
          } catch {
            // ignore — cookies sur la réponse ci-dessous
          }
          response.cookies.set(name, value, merged);
        });
      },
    },
  });

  return { supabase, response };
}
