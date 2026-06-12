"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeTunisiaPhoneToE164 } from "@/lib/phone/normalize-tunisia";
import {
  generateOtpCode,
  hashOtpCode,
  isValidOtpFormat,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/phone/otp-crypto";
import { sendWhatsAppOtpMessage } from "@/modules/phone-verification/whatsapp-cloud";

export type PhoneOtpActionResult =
  | { ok: true; devHint?: string }
  | { ok: false; error: string; code?: string };

export async function sendPhoneOtpAction(localDigits: string): Promise<PhoneOtpActionResult> {
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

  const { data: existingPhone } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_e164", phoneE164)
    .not("phone_verified_at", "is", null)
    .neq("id", user.id)
    .maybeSingle();

  if (existingPhone?.id) {
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
    channel: "whatsapp",
    expires_at: expiresAt,
  });

  if (insertErr) {
    console.error("[sendPhoneOtpAction] challenge insert", insertErr.message);
    return { ok: false, error: "Impossible de préparer la vérification.", code: "SERVER_ERROR" };
  }

  const sent = await sendWhatsAppOtpMessage(phoneE164, code);
  if (!sent.ok) {
    return { ok: false, error: sent.error, code: "WHATSAPP_SEND_FAILED" };
  }

  const devHint =
    process.env.NODE_ENV !== "production" && !process.env.WHATSAPP_CLOUD_ACCESS_TOKEN
      ? code
      : undefined;

  return { ok: true, devHint };
}

export async function verifyPhoneOtpAction(
  localDigits: string,
  code: string,
): Promise<PhoneOtpActionResult> {
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

  const { data: duplicate } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_e164", phoneE164)
    .not("phone_verified_at", "is", null)
    .neq("id", user.id)
    .maybeSingle();

  if (duplicate?.id) {
    return {
      ok: false,
      error: "Ce numéro est déjà utilisé par un autre compte.",
      code: "PHONE_IN_USE",
    };
  }

  const nowIso = new Date().toISOString();
  const localDisplay = phoneE164.replace(/^\+216/, "");

  await admin
    .from("phone_verification_challenges")
    .update({ verified_at: nowIso })
    .eq("id", challenge.id);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      phone: localDisplay,
      phone_e164: phoneE164,
      phone_verified_at: nowIso,
      verification_level: 2,
    })
    .eq("id", user.id);

  if (profileErr) {
    console.error("[verifyPhoneOtpAction] profile update", profileErr.message);
    return { ok: false, error: "Vérification OK mais profil non mis à jour.", code: "SERVER_ERROR" };
  }

  return { ok: true };
}
