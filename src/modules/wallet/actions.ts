"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isKifWalletAutoCompleteAllowed } from "@/lib/config/env";
import { requireActionUser } from "@/lib/supabase/action-auth";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { createWalletTopUpCheckoutSession } from "@/modules/wallet/stripe-checkout";
import { isStripeConfigured } from "@/lib/stripe/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TopUpResult =
  | { ok: true; newBalance: number; pendingGateway: boolean; checkoutUrl?: string }
  | { ok: false; error: string };

async function getActionUser(supabase: SupabaseClient) {
  return requireActionUser(supabase);
}

function isAutoCompleteTopUpEnabled(): boolean {
  return isKifWalletAutoCompleteAllowed();
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
  let checkoutUrl: string | undefined;

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
  } else if (isStripeConfigured()) {
    const { data: pkg } = await supabase
      .from("kif_top_up_packages")
      .select("amount, label_fr, label_en")
      .eq("id", packageId)
      .maybeSingle();

    const label = loc === "en" ? pkg?.label_en : pkg?.label_fr;
    const checkout = await createWalletTopUpCheckoutSession({
      locale: loc,
      userId: auth.user.id,
      userEmail: auth.user.email ?? null,
      requestId: row.request_id,
      amountTnd: Number(pkg?.amount ?? row.total_credit ?? 0),
      packageLabel: label ?? "Jetons KIF",
    });

    if (!checkout.ok) {
      return { ok: false, error: checkout.error };
    }

    checkoutUrl = checkout.checkoutUrl;
    pendingGateway = true;
  }

  revalidatePath(`/${loc}/profile/wallet`);
  revalidatePath(`/${loc}/profile`);

  return { ok: true, newBalance, pendingGateway, checkoutUrl };
}
