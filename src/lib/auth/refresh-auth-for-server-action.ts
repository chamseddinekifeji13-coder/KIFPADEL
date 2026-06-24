"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Safari iOS : synchronise la session (cookies) avant un server action,
 * sinon la requête POST peut partir sans jeton à jour.
 */
export async function refreshAuthForServerAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return {
        ok: false,
        error: "Session expirée. Rechargez la page ou reconnectez-vous.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.warn("[refreshAuthForServerAction]", err);
    return {
      ok: false,
      error: "Impossible de vérifier votre session. Réessayez.",
    };
  }
}
