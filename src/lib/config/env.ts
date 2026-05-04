type PublicEnv = {
  appName: string;
  defaultLocale: "fr" | "en";
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
};

function firstNonEmpty(...names: string[]): { value: string; name: string } | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) {
      return { value, name };
    }
  }
  return null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`⚠️  Missing env: ${name} — using placeholder`);
    return `MISSING_${name}`;
  }

  return value;
}

function normalizeSiteUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // VERCEL_URL is often provided without protocol.
  return `https://${trimmed}`;
}

/**
 * Resolve the public Supabase URL.
 */
function resolveSupabaseUrl(): string {
  const direct = firstNonEmpty(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  );
  if (direct) return direct.value.replace(/\/+$/, "");

  const projectId = firstNonEmpty(
    "NEXT_PUBLIC_SUPABASE_PROJECT_ID",
    "SUPABASE_PROJECT_ID",
    "NEXT_PUBLIC_SUPABASE_PROJECT_REF",
    "SUPABASE_PROJECT_REF",
  );
  if (projectId) {
    return `https://${projectId.value}.supabase.co`;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing Supabase URL: set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PROJECT_ID",
    );
  }
  return "MISSING_NEXT_PUBLIC_SUPABASE_URL";
}

/**
 * Resolve the public anon key.
 */
function resolveSupabaseAnonKey(): string {
  const found = firstNonEmpty(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  if (found) return found.value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing Supabase anon key: set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return "MISSING_NEXT_PUBLIC_SUPABASE_ANON_KEY";
}

export const publicEnv: PublicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Kifpadel",
  defaultLocale:
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en" ? "en" : "fr",
  supabaseUrl: resolveSupabaseUrl(),
  supabaseAnonKey: resolveSupabaseAnonKey(),
  siteUrl:
    normalizeSiteUrl(
      firstNonEmpty("NEXT_PUBLIC_SITE_URL", "VERCEL_URL", "URL")?.value,
    ) ||
    (process.env.NODE_ENV === "production"
      ? "https://www.kifpadel.tn"
      : "http://localhost:3000"),
};

export const serverEnv = {
  supabaseServiceRoleKey: firstNonEmpty(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY"
  )?.value || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
};
