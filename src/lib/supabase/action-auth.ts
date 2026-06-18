import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ActionAuthResult = { user: User } | { error: string };

/**
 * Identité serveur validée par Supabase (JWT). Préférer à getSession() dans les server actions.
 */
export async function requireActionUser(
  supabase: SupabaseClient,
): Promise<ActionAuthResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Connexion requise." };
  }

  return { user };
}
