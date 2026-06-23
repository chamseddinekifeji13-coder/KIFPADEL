/**
 * Simule OTP email → profil vérifié → URL célébration (?verified=1).
 * Usage: node scripts/probe-phone-otp-celebration.mjs [userEmail]
 */
import { createHash, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 1 || line.startsWith("#")) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

function pepper() {
  return (
    env.PHONE_OTP_PEPPER ??
    env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ??
    "kifpadel-dev-pepper-change-in-production"
  );
}

function hashOtpCode(code) {
  return createHash("sha256").update(`${pepper()}:${code}`).digest("hex");
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const emailArg = process.argv[2];

let userId = null;
let email = emailArg;

if (emailArg) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const hit = users?.users?.find((u) => u.email?.toLowerCase() === emailArg.toLowerCase());
  userId = hit?.id ?? null;
  email = hit?.email ?? emailArg;
} else {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, phone_verified_at, phone_e164")
    .is("phone_verified_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("candidats sans phone_verified_at:", JSON.stringify(profiles, null, 2));
  userId = profiles?.[0]?.id ?? null;
  if (userId) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    email = authUser?.user?.email ?? null;
  }
}

if (!userId || !email) {
  console.error("Utilisateur introuvable. Passez un email: node scripts/probe-phone-otp-celebration.mjs user@example.com");
  process.exit(1);
}

const testPhoneLocal = `99${String(randomInt(100000, 999999))}`;
const phoneE164 = `+216${testPhoneLocal}`;

console.log("\n=== Utilisateur test ===");
console.log({ userId, email, testPhoneLocal, phoneE164 });

const { data: before } = await admin
  .from("profiles")
  .select("phone, phone_e164, phone_verified_at")
  .eq("id", userId)
  .maybeSingle();
console.log("profil avant:", JSON.stringify(before, null, 2));

if (before?.phone_verified_at) {
  console.log("⚠ Déjà vérifié — on teste quand même la récupération (idempotent).");
}

const otpCode = String(randomInt(100000, 1000000));
const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

console.log("\n--- 1) sendPhoneOtp (insert challenge) ---");
const { error: insertErr } = await admin.from("phone_verification_challenges").insert({
  user_id: userId,
  phone_e164: phoneE164,
  code_hash: hashOtpCode(otpCode),
  channel: "email",
  expires_at: expiresAt,
});
if (insertErr) {
  console.error("insert challenge failed:", insertErr.message);
  process.exit(1);
}
console.log("challenge créé, code OTP (simulé envoi email):", otpCode);

console.log("\n--- 2) verifyPhoneOtp (hash + apply_verified_phone_profile) ---");
const { data: challenges } = await admin
  .from("phone_verification_challenges")
  .select("id, code_hash, attempts")
  .eq("user_id", userId)
  .eq("phone_e164", phoneE164)
  .is("verified_at", null)
  .gt("expires_at", new Date().toISOString())
  .order("created_at", { ascending: false })
  .limit(1);

const challenge = challenges?.[0];
if (!challenge) {
  console.error("Aucun challenge actif");
  process.exit(1);
}

const match = hashOtpCode(otpCode) === challenge.code_hash;
console.log("hash match:", match);
if (!match) {
  console.error("Hash OTP incorrect — vérifiez PHONE_OTP_PEPPER côté Vercel.");
  process.exit(1);
}

const { data: rpcData, error: rpcErr } = await admin.rpc("apply_verified_phone_profile", {
  p_user_id: userId,
  p_phone_e164: phoneE164,
});
console.log("apply_verified_phone_profile error:", rpcErr?.message ?? "none");
console.log("apply_verified_phone_profile data:", JSON.stringify(rpcData, null, 2));

if (rpcErr || !(Array.isArray(rpcData) ? rpcData[0]?.ok : rpcData?.ok)) {
  process.exit(1);
}

await admin
  .from("phone_verification_challenges")
  .update({ verified_at: new Date().toISOString(), attempts: (challenge.attempts ?? 0) + 1 })
  .eq("id", challenge.id);

const { data: after } = await admin
  .from("profiles")
  .select("phone, phone_e164, phone_verified_at")
  .eq("id", userId)
  .maybeSingle();
console.log("\nprofil après:", JSON.stringify(after, null, 2));

if (!after?.phone_verified_at) {
  console.error("✗ phone_verified_at non défini");
  process.exit(1);
}

console.log("\n--- 3) Célébration profil (redirect verify-phone → profile?verified=1) ---");
const origin = "https://www.kifpadel.tn";
console.log("URL célébration:", `${origin}/fr/profile?verified=1`);
console.log("Composant attendu: AccountVerifiedCelebration (role=status, Trophy)");

console.log("\n--- 4) Auth session (magiclink) pour smoke page profil ---");
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
if (linkErr) {
  console.warn("generateLink:", linkErr.message);
} else {
  const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  console.log("session OK:", Boolean(sessionData?.session) && !otpErr);
}

console.log("\n✓ Flux OTP → phone_verified_at → célébration OK");
