import type { ReferralShareCopy } from "@/lib/referrals/referral-messages";

function shouldTryNativeShare(url: string): boolean {
  if (typeof navigator.share !== "function") return false;
  const ua = navigator.userAgent;
  if (!/Android|iPhone|iPad|iPod/i.test(ua)) return false;
  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({ url });
    } catch {
      return false;
    }
  }
  return true;
}

export async function copyReferralPayload(payload: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch {
      /* fallback */
    }
  }

  window.prompt("Copiez ce message :", payload);
  return true;
}

export async function shareReferralLink(url: string, copy: ReferralShareCopy): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (shouldTryNativeShare(url)) {
    try {
      await navigator.share({ title: copy.title, text: copy.text, url });
      return true;
    } catch {
      /* annulé */
    }
  }

  return copyReferralPayload(copy.payload);
}

export function openReferralWhatsApp(payload: string): void {
  if (typeof window === "undefined") return;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(payload)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");
}
