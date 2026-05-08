import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Identité uniquement après validation JWT auprès de Supabase (ne pas utiliser getSession()
 * seul sur le serveur : la session cookie peut être périmée ou incohérente).
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return userData.user ?? null;
}
