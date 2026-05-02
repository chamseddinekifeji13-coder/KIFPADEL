type PublicEnv = {
  appName: string;
  defaultLocale: "fr" | "en";
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type ServerEnv = {
  supabaseServiceRoleKey: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    console.error(`❌ CRITICAL: Missing required environment variable: ${name}`);
    return "";
  }

  return value;
}

export const publicEnv: PublicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Kifpadel",
  defaultLocale:
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en" ? "en" : "fr",
  supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

export const serverEnv: ServerEnv = {
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    getRequiredEnv("SUPABASE_SECRET_KEY"),
};
