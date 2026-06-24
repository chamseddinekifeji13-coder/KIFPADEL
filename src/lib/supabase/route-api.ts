import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { publicEnv } from "@/lib/config/env";
type PendingCookie = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase pour routes API JSON (POST réservation, etc.).
 * Propage les cookies rafraîchis sur la réponse HTTP.
 */
export async function createSupabaseRouteApiClient() {
  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];

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
            // Route handler : cookies aussi sur NextResponse
          }
          pendingCookies.push({ name, value, options: merged });
        });
      },
    },
  });

  function attachCookies(response: NextResponse) {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  return { supabase, attachCookies };
}
