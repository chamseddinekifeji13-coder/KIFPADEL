"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TopUpResult =
  | { ok: true; newBalance: number; pendingGateway: boolean }
  | { ok: false; error: string };

async function getActionUser(
  supabase: SupabaseClient,
): Promise<{ user: User } | { error: string }> {
  const {
    data: { session: initialSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  const { data: refreshData } = await supabase.auth.refreshSession();
  const session = refreshData.session ?? initialSession;

  if (sessionError || !session?.user) {
    return { error: "Connexion requise." };
  }

  return { user: session.user };
}

function isAutoCompleteTopUpEnabled(): boolean {
  return process.env.KIF_WALLET_AUTO_COMPLETE_TOPUP === "true";
}

export async function requestKifTopUpAction(input: {
  locale: string;
  packageId: string;
}): Promise<TopUpResult> {
  const loc = input.locale?.trim() || "fr";
  const packageId = input.packageId?.trim();

  if (!packageId) {
    return { ok: false, error: "Pack invalide." };
  }

  const supabase = await createSupabaseServerActionClient();
  const auth = await getActionUser(supabase);
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }

  const { data: rows, error } = await supabase.rpc("kif_request_top_up", {
    p_package_id: packageId,
  });

  if (error) {
    return { ok: false, error: error.message || "Recharge impossible." };
  }

  const row = (Array.isArray(rows) ? rows[0] : rows) as {
    ok?: boolean;
    request_id?: string;
    total_credit?: number;
    error_code?: string;
    error_message?: string;
  } | null;

  if (!row?.ok || !row.request_id) {
    return {
      ok: false,
      error: row?.error_message || "Recharge impossible.",
    };
  }

  let newBalance = 0;
  let pendingGateway = true;

  if (isAutoCompleteTopUpEnabled()) {
    const admin = createSupabaseAdminClient();
    const { data: completeRows, error: completeError } = await admin.rpc("kif_complete_top_up", {
      p_request_id: row.request_id,
    });

    if (completeError) {
      return { ok: false, error: completeError.message || "Crédit wallet échoué." };
    }

    const complete = (Array.isArray(completeRows) ? completeRows[0] : completeRows) as {
      ok?: boolean;
      new_balance?: number;
      error_message?: string;
    } | null;

    if (!complete?.ok) {
      return {
        ok: false,
        error: complete?.error_message || "Crédit wallet échoué.",
      };
    }

    newBalance = Number(complete.new_balance ?? 0);
    pendingGateway = false;
  }

  revalidatePath(`/${loc}/profile/wallet`);
  revalidatePath(`/${loc}/profile`);

  return { ok: true, newBalance, pendingGateway };
}
