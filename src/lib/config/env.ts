type PublicEnv = {
  appName: string;
  defaultLocale: "fr" | "en";
  supabaseUrl: string;
  supabaseAnonKey: string;
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

/**
 * Resolve the public Supabase URL.
 *
 * Order of precedence:
 *   1. NEXT_PUBLIC_SUPABASE_URL          (canonical)
 *   2. SUPABASE_URL                      (legacy / server alias)
 *   3. Derived from a project-id env var (NEXT_PUBLIC_SUPABASE_PROJECT_ID,
 *      SUPABASE_PROJECT_ID, or NEXT_PUBLIC_SUPABASE_PROJECT_REF).
 *
 * The project ID itself is not a secret — it appears in the public URL —
 * so deriving the URL client-side is safe.
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
  console.warn(
    "⚠️  Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PROJECT_ID — using placeholder",
  );
  return "MISSING_NEXT_PUBLIC_SUPABASE_URL";
}

/**
 * Resolve the public anon (a.k.a. publishable) key.
 *
 * Supabase has been migrating naming from "anon" to "publishable".
 * Both refer to the same key class and may be safely exposed to the browser.
 *
 * Order of precedence:
 *   1. NEXT_PUBLIC_SUPABASE_ANON_KEY        (legacy canonical)
 *   2. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (modern canonical)
 */
function resolveSupabaseAnonKey(): string {
  const found = firstNonEmpty(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  if (found) return found.value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing Supabase anon key: set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  console.warn(
    "⚠️  Missing NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — using placeholder",
  );
  return "MISSING_NEXT_PUBLIC_SUPABASE_ANON_KEY";
}

export const publicEnv: PublicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Kifpadel",
  defaultLocale:
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en" ? "en" : "fr",
  supabaseUrl: resolveSupabaseUrl(),
  supabaseAnonKey: resolveSupabaseAnonKey(),
};

/**
 * Server-only resolver for the Supabase service-role / secret key.
 *
 * NEVER reference any of these names with a `NEXT_PUBLIC_` prefix —
 * they must never reach the browser bundle.
 *
 * Order of precedence:
 *   1. SUPABASE_SERVICE_ROLE_KEY  (legacy canonical)
 *   2. SUPABASE_SECRET_KEY        (modern canonical)
 */
export function getSupabaseServiceRoleKey(): string {
  const found = firstNonEmpty(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  );
  if (found) return found.value;

  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}
