import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCALES, DEFAULT_LOCALE } from "@/i18n/config";
import { getEdgeSupabasePublicConfig } from "@/lib/config/public-env-edge";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE_SEC } from "@/lib/auth/referral-cookie";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";
import { isUuidString } from "@/lib/uuid-utils";

/**
 * Proxy Next.js 16 — refresh session Supabase, i18n, validation liens réservation.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let supabase;
  try {
    const { supabaseUrl, supabaseAnonKey } = getEdgeSupabasePublicConfig();
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
  } catch (err) {
    console.error("[Proxy] CRITICAL: Failed to create Supabase client:", err);
    return response;
  }

  try {
    const isShellHome =
      pathname === "/fr" ||
      pathname === "/en" ||
      pathname === "/fr/" ||
      pathname === "/en/";

    if (isShellHome) {
      await supabase.auth.getSession();
    } else {
      await supabase.auth.getUser();
    }
  } catch (err) {
    console.error("[Proxy] Error during session refresh:", err);
  }

  const { pathname } = request.nextUrl;

  const hostname = request.nextUrl.hostname;
  if (hostname === "kifpadel.tn") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "www.kifpadel.tn";
    const redirectResponse = NextResponse.redirect(canonicalUrl, 308);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  if (pathname === "/") {
    const url = new URL(`/${DEFAULT_LOCALE}`, request.url);
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  const segments = pathname.split("/");
  const candidateLocale = segments[1];
  const hasExtension = segments[segments.length - 1].includes(".");

  if (
    candidateLocale === "api" ||
    candidateLocale === "_next" ||
    hasExtension ||
    pathname.startsWith("/icons")
  ) {
    return response;
  }

  if (!LOCALES.includes(candidateLocale as (typeof LOCALES)[number])) {
    const url = new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url);
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  const section = segments[2];
  const clubSegment = segments[3];
  if (section === "book" && clubSegment) {
    const clubId = decodeURIComponent(clubSegment);
    if (!isUuidString(clubId)) {
      const url = new URL(`/${candidateLocale}/book`, request.url);
      url.searchParams.set("invalidClubLink", "1");
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
  }

  const authSegment = segments[3];
  if (section === "auth" && (authSegment === "sign-in" || authSegment === "sign-up")) {
    const referrerId = parseReferrerIdParam(request.nextUrl.searchParams.get("ref"));
    if (referrerId) {
      response.cookies.set(REFERRAL_COOKIE, referrerId, {
        path: "/",
        maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
