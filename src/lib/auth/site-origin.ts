import { headers } from "next/headers";

import { publicEnv } from "@/lib/config/env";

/** Apex → www pour un domaine canonique (cookies OAuth PKCE sur le même host). */
function normalizeSiteOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === "kifpadel.tn") {
      url.hostname = "www.kifpadel.tn";
    }
    return url.origin;
  } catch {
    return publicEnv.siteUrl;
  }
}

/**
 * Origine publique du site pour les redirect OAuth / emails.
 * Préfère le host de la requête courante (Vercel x-forwarded-host).
 */
export async function resolveSiteOrigin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  if (host) {
    const hostOnly = host.split(",")[0]?.trim();
    if (hostOnly) {
      return normalizeSiteOrigin(`${proto}://${hostOnly}`);
    }
  }

  return normalizeSiteOrigin(publicEnv.siteUrl);
}

export function buildAuthCallbackUrl(origin: string, locale: string, next: string): string {
  const callbackUrl = new URL(`/${locale}/auth/callback`, origin);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}
