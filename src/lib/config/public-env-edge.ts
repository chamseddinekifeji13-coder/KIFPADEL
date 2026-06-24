/** Variables publiques Supabase — compatible Edge Runtime (middleware). */
export function getEdgeSupabasePublicConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\s+/g, "").replace(/\/+$/, "") ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.replace(/\s+/g, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s+/g, "") ||
    "";

  if (!rawUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabaseUrl = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : rawUrl.endsWith(".supabase.co")
      ? `https://${rawUrl}`
      : `https://${rawUrl}.supabase.co`;

  return { supabaseUrl, supabaseAnonKey: anonKey };
}
