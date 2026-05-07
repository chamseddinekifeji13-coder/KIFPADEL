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

/** `next build` en production : pre-rendu sans .env local (CI / machine dev). */
function isRunningNextProductionBuild(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const argv = process.argv.join(" ");
  if (/\bnext\s+build\b/i.test(argv)) {
    return true;
  }

  return process.env.npm_lifecycle_event === "build";
}

/** URL JWT-shaped factices uniquement pour finir la compile ; jamais en prod deployee avec vraies requetes. */
const BUILD_ONLY_SUPABASE_URL_PLACEHOLDER = "https://kz-build-placeholder.supabase.co";
const BUILD_ONLY_SUPABASE_ANON_PLACEHOLDER =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MCwiZXhwIjo5MDAwMDAwMDAwfQ.build-placeholder-invalid-signature-but-long-enough";

let buildTimeSupabasePlaceholderWarned = false;

function warnOnceBuildTimeSupabasePlaceholder() {
  if (buildTimeSupabasePlaceholderWarned) {
    return;
  }
  buildTimeSupabasePlaceholderWarned = true;
  console.warn(
    "[Kifpadel] next build sans NEXT_PUBLIC_SUPABASE_URL / ANON_KEY : valeurs factices pour terminer le pre-rendu uniquement.",
  );
}

function normalizeSupabaseUrl(raw: string): string {
  // Use regex to strip all whitespace characters including \r and \n
  const cleaned = raw.replace(/\s+/g, "").replace(/^['"]+|['"]+$/g, "").replace(/\/+$/, "");
  
  if (!cleaned) {
    throw new Error("Supabase URL is empty after normalization.");
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  if (cleaned.endsWith(".supabase.co")) {
    return `https://${cleaned}`;
  }

  if (/^[a-z0-9-]+$/i.test(cleaned)) {
    return `https://${cleaned}.supabase.co`;
  }

  throw new Error(`Invalid supabaseUrl: "${cleaned}" is malformed.`);
}

/**
 * Resolve the public Supabase URL.
 */
function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (url) {
    return normalizeSupabaseUrl(url);
  }

  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 
                    process.env.SUPABASE_PROJECT_ID || 
                    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || 
                    process.env.SUPABASE_PROJECT_REF;
                    
  if (projectId) {
    return normalizeSupabaseUrl(projectId);
  }

  if (isRunningNextProductionBuild()) {
    warnOnceBuildTimeSupabasePlaceholder();
    return BUILD_ONLY_SUPABASE_URL_PLACEHOLDER;
  }

  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL: Missing Supabase URL in production environment variables.");
  }
  return "MISSING_NEXT_PUBLIC_SUPABASE_URL";
}

/**
 * Resolve the public anon key.
 */
function resolveSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
              process.env.SUPABASE_ANON_KEY;
              
  if (key) {
    return key.replace(/\s+/g, "").replace(/^['"]+|['"]+$/g, "");
  }

  if (isRunningNextProductionBuild()) {
    warnOnceBuildTimeSupabasePlaceholder();
    return BUILD_ONLY_SUPABASE_ANON_PLACEHOLDER;
  }

  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL: Missing Supabase Anon Key in production environment variables.");
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
    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   process.env.VERCEL_URL || 
                   process.env.URL;
                   
    if (!rawUrl) {
      return process.env.NODE_ENV === "production" 
        ? "https://www.kifpadel.tn" 
        : "http://localhost:3000";
    }
    
    let url = rawUrl.replace(/\/+$/, "");
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    return url;
  })(),
};

// Client-side diagnostic for debugging Vercel environment variables
if (typeof window !== "undefined") {
  const missing = [];
  if (publicEnv.supabaseUrl.includes("your-project-id") || publicEnv.supabaseUrl.includes("MISSING")) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (publicEnv.supabaseAnonKey.includes("your-anon") || publicEnv.supabaseAnonKey.includes("MISSING")) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  
  if (missing.length > 0) {
    console.warn(
      `[Kifpadel] ⚠️ Configuration d'authentification incomplète ! Variables manquantes : ${missing.join(", ")}. `
    );
  } else {
    // Basic format check
    if (!publicEnv.supabaseUrl.startsWith("https://")) {
      console.error("[Kifpadel] ❌ NEXT_PUBLIC_SUPABASE_URL doit commencer par https://");
    }
    if (publicEnv.supabaseAnonKey.length < 50) {
      console.error("[Kifpadel] ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY semble trop courte ou invalide.");
    }
  }
}

let cachedSupabaseServiceRoleKey: string | null = null;

/**
 * Cle service role pour le client Supabase admin.
 * Pendant `next build` ou sans .env local, aucune valeur n'est exigée ici : un placeholder permet la compilation ;
 * tout appel à `createSupabaseAdminClient()` sans vraie cle echouera avec une erreur explicite.
 */
function resolveSupabaseServiceRoleKey(): string {
  if (cachedSupabaseServiceRoleKey !== null) {
    return cachedSupabaseServiceRoleKey;
  }

  const picked = firstNonEmpty("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  const raw =
    picked?.value ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";

  const cleaned = raw.replace(/\s+/g, "").replace(/^['"]+|['"]+$/g, "");

  if (cleaned.length > 0) {
    cachedSupabaseServiceRoleKey = cleaned;
    return cleaned;
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "⚠️  Missing SUPABASE_SERVICE_ROLE_KEY — using placeholder locally; admin operations will fail until it is set.",
    );
  }

  cachedSupabaseServiceRoleKey = "MISSING_SUPABASE_SERVICE_ROLE_KEY";
  return cachedSupabaseServiceRoleKey;
}

export const serverEnv = {
  get supabaseServiceRoleKey(): string {
    return resolveSupabaseServiceRoleKey();
  },
};
