import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  // Fallback: when session cookie is stale/missing, ask Auth server directly.
  const { data: userData } = await supabase.auth.getUser();
  return userData.user ?? null;
}
