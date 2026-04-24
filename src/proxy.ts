import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCALES, DEFAULT_LOCALE } from "@/i18n/config";

/**
 * Proxy (formerly middleware in Next.js < 16).
 *
 * Responsibilities:
 * 1. Refresh the Supabase auth session on every request (keep cookies alive).
 * 2. Redirect bare `/` to `/<DEFAULT_LOCALE>`.
 * 3. Reject unknown locale prefixes → 404.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ------------------------------------------------------------------ */
  /* 1 — Supabase session refresh                                       */
  /*    The @supabase/ssr library stores the session in cookies.         */
  /*    We forward the existing cookies so server components can read    */
  /*    the authenticated user. A full refresh (re-sign) happens only   */
  /*    when the access token is about to expire; @supabase/ssr handles */
  /*    that transparently when `createServerClient` is called inside   */
  /*    a server component or action. The proxy simply passes cookies   */
  /*    through (NextResponse.next() does this by default).             */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* 2 — i18n redirect: bare "/" → "/fr"                                */
  /* ------------------------------------------------------------------ */
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
  }

  /* ------------------------------------------------------------------ */
  /* 3 — Validate locale segment                                        */
  /* ------------------------------------------------------------------ */
  const segments = pathname.split("/");
  const candidateLocale = segments[1]; // e.g. "fr" or "en"

  // API & static assets are not locale-prefixed — let them through.
  if (
    candidateLocale === "api" ||
    candidateLocale === "_next" ||
    candidateLocale === "sw.js" ||
    pathname.startsWith("/icons") ||
    pathname.endsWith(".webmanifest")
  ) {
    return NextResponse.next();
  }

  // If the first segment is not a known locale, redirect to default.
  if (!LOCALES.includes(candidateLocale as (typeof LOCALES)[number])) {
    return NextResponse.redirect(
      new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url),
    );
  }

  return NextResponse.next();
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
