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
      throw new Error(`Missing required environment variable: ${name}. Ensure it is set in your deployment environment (e.g., Vercel Dashboard).`);
    }
    console.warn(`⚠️  Missing env: ${name} — using placeholder`);
    return `MISSING_${name}`;
  }

  return value;
}

function normalizeSiteUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, "").replace(/\/+$/, "");
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // VERCEL_URL is often provided without protocol.
  return `https://${trimmed}`;
}

function normalizeSupabaseUrl(raw: string): string {
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, "").replace(/\/+$/, "");
  if (!cleaned) {
    throw new Error("Supabase URL is empty after normalization.");
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  if (cleaned.endsWith(".supabase.co")) {
    return `https://${cleaned}`;
  }

  // Common mistake: project ref provided in URL variable.
  if (/^[a-z0-9-]+$/i.test(cleaned)) {
    return `https://${cleaned}.supabase.co`;
  }

  throw new Error("Invalid supabaseUrl: Provided URL is malformed.");
}

/**
 * Resolve the public Supabase URL.
 */
function resolveSupabaseUrl(): string {
  const direct = firstNonEmpty(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  );
  if (direct) {
    // Basic validation
    if (!direct.value.startsWith("https://")) {
      console.warn(`⚠️  Supabase URL "${direct.name}" does not start with https://`);
    }
    return normalizeSupabaseUrl(direct.value);
  }

  const projectId = firstNonEmpty(
    "NEXT_PUBLIC_SUPABASE_PROJECT_ID",
    "SUPABASE_PROJECT_ID",
    "NEXT_PUBLIC_SUPABASE_PROJECT_REF",
    "SUPABASE_PROJECT_REF",
  );
  if (projectId) {
    return normalizeSupabaseUrl(projectId.value);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing Supabase URL: set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PROJECT_ID. " +
      "Note: On Vercel, you MUST use the NEXT_PUBLIC_ prefix for variables used in the browser.",
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
    "SUPABASE_ANON_KEY",
  );
  if (found) return found.value.trim().replace(/^['"]+|['"]+$/g, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing Supabase anon key: set NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Note: On Vercel, you MUST use the NEXT_PUBLIC_ prefix for variables used in the browser.",
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
  siteUrl: (() => {
    const found = firstNonEmpty(
      "NEXT_PUBLIC_SITE_URL",
      "VERCEL_URL",
      "URL"
    );
    if (!found) {
      return process.env.NODE_ENV === "production" 
        ? "https://www.kifpadel.tn" 
        : "http://localhost:3000";
    }
    
    let url = found.value.replace(/\/+$/, "");
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    return url;
  })(),
};

export const serverEnv = {
  supabaseServiceRoleKey: firstNonEmpty(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY"
  )?.value || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
};
