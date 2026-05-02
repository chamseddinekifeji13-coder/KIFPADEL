import type { MetadataRoute } from "next";

const SITE_URL = "https://www.kifpadel.tn";

const routes = [
  "",
  "/play-now",
  "/find-players",
  "/book",
  "/dashboard",
  "/auth/sign-in",
  "/auth/sign-up",
  "/onboarding",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["fr", "en"] as const;
  const now = new Date();

  return locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${SITE_URL}/${locale}${route}`,
      lastModified: now,
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1 : 0.7,
    })),
  );
}
