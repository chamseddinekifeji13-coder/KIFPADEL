"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeTunisiaPhoneToE164 } from "@/lib/phone/normalize-tunisia";
import {
  getPhoneVerificationChannel,
  isInstantPhoneVerificationAllowed,
  isOtpPhoneVerificationChannel,
} from "@/lib/phone/verification-channel";
import {
  generateOtpCode,
  hashOtpCode,
  isValidOtpFormat,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/phone/otp-crypto";
import { isPhoneE164VerifiedByAnotherUser } from "@/lib/phone/phone-duplicate-guard";
import { applyVerifiedPhoneToProfile } from "@/modules/phone-verification/apply-verified-phone";
import { sendEmailOtpMessage } from "@/modules/phone-verification/email-otp";
import { sendWhatsAppOtpMessage } from "@/modules/phone-verification/whatsapp-cloud";

export type PhoneOtpActionResult =
  | { ok: true; devHint?: string }
  | { ok: false; error: string; code?: string };

export async function getPhoneVerificationChannelAction(): Promise<
  "instant" | "email" | "whatsapp"
> {
  return getPhoneVerificationChannel();
}

/**
 * Confirmation gratuite : enregistre le numéro sans OTP (défaut produit).
 */
export async function confirmPhoneNumberAction(localDigits: string): Promise<PhoneOtpActionResult> {
  if (!isInstantPhoneVerificationAllowed()) {
    return {
      ok: false,
      error: "La vérification par code est obligatoire. Demandez un code OTP.",
      code: "OTP_REQUIRED",
    };
  }

  const phoneE164 = normalizeTunisiaPhoneToE164(localDigits);
  if (!phoneE164) {
    return { ok: false, error: "Numéro tunisien invalide (8 chiffres après +216).", code: "INVALID_PHONE" };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise.", code: "UNAUTHORIZED" };
  }

  return applyVerifiedPhoneToProfile(supabase, user.id, phoneE164);
}

export async function sendPhoneOtpAction(localDigits: string): Promise<PhoneOtpActionResult> {
  const channel = getPhoneVerificationChannel();

  if (channel === "instant") {
    return confirmPhoneNumberAction(localDigits);
  }

  const phoneE164 = normalizeTunisiaPhoneToE164(localDigits);
  if (!phoneE164) {
    return { ok: false, error: "Numéro tunisien invalide (8 chiffres après +216).", code: "INVALID_PHONE" };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise.", code: "UNAUTHORIZED" };
  }

  const admin = createSupabaseAdminClient();

  if (await isPhoneE164VerifiedByAnotherUser(phoneE164, user.id)) {
    return {
      ok: false,
      error: "Ce numéro est déjà lié à un autre compte.",
      code: "PHONE_IN_USE",
    };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentSends } = await admin
    .from("phone_verification_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (recentSends !== null && recentSends >= OTP_MAX_SENDS_PER_HOUR) {
    return {
      ok: false,
      error: "Trop de demandes. Réessayez dans une heure.",
      code: "RATE_LIMIT",
    };
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error: insertErr } = await admin.from("phone_verification_challenges").insert({
    user_id: user.id,
    phone_e164: phoneE164,
    code_hash: hashOtpCode(code),
    channel,
    expires_at: expiresAt,
  });

  if (insertErr) {
    console.error("[sendPhoneOtpAction] challenge insert", insertErr.message);
    return { ok: false, error: "Impossible de préparer la vérification.", code: "SERVER_ERROR" };
  }

  if (channel === "email") {
    const email = user.email?.trim();
    if (!email) {
      return { ok: false, error: "Aucune adresse e-mail sur ce compte.", code: "NO_EMAIL" };
    }

    const sent = await sendEmailOtpMessage(email, code);
    if (!sent.ok) {
      return { ok: false, error: sent.error, code: "EMAIL_SEND_FAILED" };
    }
  } else {
    const sent = await sendWhatsAppOtpMessage(phoneE164, code);
    if (!sent.ok) {
      return { ok: false, error: sent.error, code: "WHATSAPP_SEND_FAILED" };
    }
  }

  const devHint =
    process.env.NODE_ENV !== "production" &&
    (channel === "whatsapp" && !process.env.WHATSAPP_CLOUD_ACCESS_TOKEN)
      ? code
      : undefined;

  return { ok: true, devHint };
}

export async function verifyPhoneOtpAction(
  localDigits: string,
  code: string,
): Promise<PhoneOtpActionResult> {
  const channel = getPhoneVerificationChannel();
  if (!isOtpPhoneVerificationChannel(channel)) {
    return confirmPhoneNumberAction(localDigits);
  }

  if (!isValidOtpFormat(code)) {
    return { ok: false, error: "Code à 6 chiffres requis.", code: "INVALID_CODE" };
  }

  const phoneE164 = normalizeTunisiaPhoneToE164(localDigits);
  if (!phoneE164) {
    return { ok: false, error: "Numéro invalide.", code: "INVALID_PHONE" };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise.", code: "UNAUTHORIZED" };
  }

  const admin = createSupabaseAdminClient();

  const { data: challenge, error: readErr } = await admin
    .from("phone_verification_challenges")
    .select("id, code_hash, expires_at, attempts, verified_at")
    .eq("user_id", user.id)
    .eq("phone_e164", phoneE164)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr || !challenge) {
    return { ok: false, error: "Aucun code actif. Demandez un nouveau code.", code: "NO_CHALLENGE" };
  }

  if (challenge.verified_at) {
    return { ok: false, error: "Ce code a déjà été utilisé.", code: "ALREADY_USED" };
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expiré. Demandez un nouveau code.", code: "EXPIRED" };
  }

  if ((challenge.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Trop d'essais. Demandez un nouveau code.", code: "TOO_MANY_ATTEMPTS" };
  }

  const codeHash = hashOtpCode(code);
  const match = codeHash === challenge.code_hash;

  await admin
    .from("phone_verification_challenges")
    .update({ attempts: (challenge.attempts ?? 0) + 1 })
    .eq("id", challenge.id);

  if (!match) {
    return { ok: false, error: "Code incorrect.", code: "WRONG_CODE" };
  }

  const nowIso = new Date().toISOString();

  await admin
    .from("phone_verification_challenges")
    .update({ verified_at: nowIso })
    .eq("id", challenge.id);

  const applied = await applyVerifiedPhoneToProfile(supabase, user.id, phoneE164);
  if (!applied.ok) {
    return applied;
  }

  return { ok: true };
}
