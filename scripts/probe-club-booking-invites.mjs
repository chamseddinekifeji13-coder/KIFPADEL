/**
 * Teste le flux invitations club (RPC create_club_booking_split_invites).
 * Usage: node scripts/probe-club-booking-invites.mjs [staffEmail] [bookingId]
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 1 || line.startsWith("#")) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const clubId = "53b14428-3af2-4e78-b91d-bbe9d1b2f539";
const staffEmailArg = process.argv[2];
const bookingIdArg = process.argv[3];

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Staff du club
const { data: memberships } = await admin
  .from("club_memberships")
  .select("user_id, role")
  .eq("club_id", clubId)
  .eq("status", "active");

console.log("club_memberships:", JSON.stringify(memberships, null, 2));

let staffUserId = null;
let staffEmail = staffEmailArg;

if (staffEmailArg) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const hit = users?.users?.find((u) => u.email?.toLowerCase() === staffEmailArg.toLowerCase());
  staffUserId = hit?.id ?? null;
  staffEmail = hit?.email ?? staffEmailArg;
} else if (memberships?.length) {
  for (const m of memberships) {
    const uid = m.user_id;
    if (!uid) continue;
    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    if (authUser?.user?.email) {
      staffUserId = uid;
      staffEmail = authUser.user.email;
      console.log("auto staff:", staffEmail, "role:", m.role);
      break;
    }
  }
}

if (!staffUserId) {
  console.error("Aucun staff trouvé. Passez un email: node scripts/probe-club-booking-invites.mjs email@club.tn");
  process.exit(1);
}

// Réservations actives avec places libres
const { data: bookings } = await admin
  .from("bookings")
  .select("id, starts_at, ends_at, status, total_price, court_id")
  .eq("club_id", clubId)
  .not("status", "in", '("cancelled","completed","no_show","expired")')
  .gte("starts_at", new Date().toISOString())
  .order("starts_at")
  .limit(20);

const candidates = [];
for (const b of bookings ?? []) {
  const { data: parts } = await admin
    .from("booking_participants")
    .select("id, seat_index, status, share_price")
    .eq("booking_id", b.id);
  const active = (parts ?? []).filter((p) => p.status !== "cancelled");
  const { data: invites } = await admin
    .from("booking_participant_invites")
    .select("id, seat_index, status, invite_source")
    .eq("booking_id", b.id)
    .eq("status", "pending");
  const pendingInvites = invites?.length ?? 0;
  const open = 4 - active.length - pendingInvites;
  if (open > 0) {
    candidates.push({
      bookingId: b.id,
      starts_at: b.starts_at,
      status: b.status,
      activeSeats: active.length,
      pendingInvites,
      openSeats: open,
      sharePrice: active[0]?.share_price ?? b.total_price,
    });
  }
}

console.log("\nbookings avec places libres:", JSON.stringify(candidates, null, 2));

const bookingId = bookingIdArg ?? candidates[0]?.bookingId;
if (!bookingId) {
  console.error("Aucune réservation éligible (créneau futur, < 4 places occupées).");
  process.exit(1);
}

console.log("\n=== Auth staff:", staffEmail, "===");
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: staffEmail,
});
if (linkErr) {
  console.error("generateLink failed:", linkErr.message);
  process.exit(1);
}

const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
  type: "magiclink",
  token_hash: linkData.properties.hashed_token,
});
if (otpErr) {
  console.error("verifyOtp failed:", otpErr.message);
  process.exit(1);
}

const authed = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
await authed.auth.setSession({
  access_token: sessionData.session.access_token,
  refresh_token: sessionData.session.refresh_token,
});

const { data: hasRole } = await authed.rpc("has_club_role", {
  p_club_id: clubId,
  p_roles: ["club_staff", "club_manager", "club_admin", "platform_admin"],
});
console.log("has_club_role:", hasRole);

console.log("\n--- create_club_booking_split_invites ---");
const { data: created, error: createErr } = await authed.rpc("create_club_booking_split_invites", {
  p_booking_id: bookingId,
});
console.log("error:", createErr?.message ?? "none");
console.log("invites:", JSON.stringify(created, null, 2));

if (createErr) {
  process.exit(1);
}

const inviteIds = (created ?? []).map((r) => r.invite_id);
const { data: rows } = await admin
  .from("booking_participant_invites")
  .select("id, seat_index, share_price, invite_source, status, expires_at")
  .in("id", inviteIds.length ? inviteIds : ["00000000-0000-0000-0000-000000000000"]);

console.log("\nDB rows:", JSON.stringify(rows, null, 2));

console.log("\n--- refresh_club_booking_split_invite_links ---");
const { data: refreshed, error: refreshErr } = await authed.rpc("refresh_club_booking_split_invite_links", {
  p_booking_id: bookingId,
});
console.log("error:", refreshErr?.message ?? "none");
console.log(
  "tokens regen:",
  (refreshed ?? []).map((r) => ({
    invite_id: r.invite_id,
    seat_index: r.seat_index,
    token_len: String(r.invite_token ?? "").length,
    share_price: r.share_price,
  })),
);

const sample = refreshed?.[0];
if (sample?.invite_token) {
  const origin = "https://kifpadel.com";
  const url = `${origin}/fr/bookings/invite/${sample.invite_id}?t=${encodeURIComponent(sample.invite_token)}`;
  console.log("\nSample invite URL (first seat):", url.slice(0, 120) + "...");
}

console.log("\n✓ Flux club invites OK");
