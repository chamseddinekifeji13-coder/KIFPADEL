import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCALES, DEFAULT_LOCALE } from "@/i18n/config";
import { publicEnv } from "@/lib/config/env";

/**
 * Middleware.
 *
 * Responsibilities:
 * 1. Refresh the Supabase auth session on every request (keep cookies alive).
 * 2. Redirect bare `/` to `/<DEFAULT_LOCALE>`.
 * 3. Reject unknown locale prefixes → 404.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create the Supabase client
  let supabase;
  try {
    supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
  } catch (err) {
    console.error("[Middleware] CRITICAL: Failed to create Supabase client:", err);
    return response; // Continue without auth instead of crashing
  }

  // Refresh the session
  try {
    const { error: userError } = await supabase.auth.getUser();
    if (userError) {
      // It's normal for guests, but let's log if it's a config error
      const msg = userError.message.toLowerCase();
      if (msg.includes("api key") || msg.includes("invalid") || msg.includes("unauthorized")) {
        console.error("[Middleware] Auth Config Error detected via getUser():", userError.message);
      }
    }
  } catch (err) {
    console.error("[Middleware] Error during session refresh:", err);
  }

  const { pathname } = request.nextUrl;

  /* ------------------------------------------------------------------ */
  /* 2 — i18n redirect: bare "/" → "/fr"                                */
  /* ------------------------------------------------------------------ */
  if (pathname === "/") {
    const url = new URL(`/${DEFAULT_LOCALE}`, request.url);
    const redirectResponse = NextResponse.redirect(url);
    // Copy cookies to redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  /* ------------------------------------------------------------------ */
  /* 3 — Validate locale segment                                        */
  /* ------------------------------------------------------------------ */
  const segments = pathname.split("/");
  const candidateLocale = segments[1]; // e.g. "fr" or "en"

  // API & static assets are not locale-prefixed — let them through.
  const hasExtension = segments[segments.length - 1].includes(".");

  if (
    candidateLocale === "api" ||
    candidateLocale === "_next" ||
    hasExtension ||
    pathname.startsWith("/icons")
  ) {
    return response;
  }

  // If the first segment is not a known locale, redirect to default.
  if (!LOCALES.includes(candidateLocale as (typeof LOCALES)[number])) {
    const url = new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url);
    const redirectResponse = NextResponse.redirect(url);
    // Copy cookies to redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimiser)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
