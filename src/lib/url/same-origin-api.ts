/** Chemin API en URL absolue (fiable en PWA iOS / WebKit). */
export function sameOriginApiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return normalized;
  return `${window.location.origin}${normalized}`;
}
