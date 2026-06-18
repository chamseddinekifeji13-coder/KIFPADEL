import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export type KifTopUpPackage = {
  id: string;
  labelFr: string;
  labelEn: string;
  amount: number;
  bonusAmount: number;
  sortOrder: number;
};

export type KifWalletTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

export type KifWalletSummary = {
  balance: number;
  currency: string;
  packages: KifTopUpPackage[];
  transactions: KifWalletTransaction[];
};

function coerceNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchKifWalletSummary(userId: string): Promise<KifWalletSummary> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: walletRow } = await supabase
      .from("kif_wallets")
      .select("balance, currency")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: packageRows } = await supabase
      .from("kif_top_up_packages")
      .select("id, label_fr, label_en, amount, bonus_amount, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const { data: txRows } = await supabase
      .from("kif_wallet_transactions")
      .select("id, type, amount, balance_after, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    return {
      balance: coerceNumber(walletRow?.balance),
      currency: (walletRow?.currency as string) ?? "TND",
      packages: (packageRows ?? []).map((row) => ({
        id: row.id as string,
        labelFr: row.label_fr as string,
        labelEn: row.label_en as string,
        amount: coerceNumber(row.amount),
        bonusAmount: coerceNumber(row.bonus_amount),
        sortOrder: Number(row.sort_order ?? 0),
      })),
      transactions: (txRows ?? []).map((row) => ({
        id: row.id as string,
        type: row.type as string,
        amount: coerceNumber(row.amount),
        balanceAfter: coerceNumber(row.balance_after),
        description: (row.description as string | null) ?? null,
        createdAt: row.created_at as string,
      })),
    };
  } catch (err) {
    rethrowFrameworkError(err);
    return { balance: 0, currency: "TND", packages: [], transactions: [] };
  }
}

export async function fetchKifWalletBalance(userId: string): Promise<number> {
  const summary = await fetchKifWalletSummary(userId);
  return summary.balance;
}
