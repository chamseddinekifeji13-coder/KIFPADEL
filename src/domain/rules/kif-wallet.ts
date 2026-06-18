export type KifWalletTransactionType =
  | "top_up"
  | "debit_booking"
  | "debit_match"
  | "refund"
  | "adjustment";

export function formatKifAmount(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0 DT";
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)} DT`;
}

export function isWalletPaymentMethod(method: string | null | undefined): boolean {
  const m = String(method ?? "").trim().toLowerCase();
  return m === "wallet" || m === "online";
}

export function normalizePaymentMethodForWallet(
  method: "wallet" | "on_site" | "online",
): "wallet" | "on_site" {
  return method === "on_site" ? "on_site" : "wallet";
}

export function transactionTypeLabel(
  type: string,
  locale: "fr" | "en",
): string {
  const t = String(type ?? "").toLowerCase();
  if (locale === "en") {
    if (t === "top_up") return "Top-up";
    if (t === "debit_booking") return "Court booking";
    if (t === "debit_match") return "Open match";
    if (t === "refund") return "Refund";
    return "Adjustment";
  }
  if (t === "top_up") return "Recharge";
  if (t === "debit_booking") return "Réservation terrain";
  if (t === "debit_match") return "Match ouvert";
  if (t === "refund") return "Remboursement";
  return "Ajustement";
}
