import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user) {
    return userData.user;
  }

  // Fallback: in some SSR flows, getUser() may fail to refresh tokens,
  // while session cookies are still present and valid.
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user ?? null;
}
