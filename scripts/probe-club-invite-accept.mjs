/**
 * Accepte une invitation club (invite_source=club, paiement on_site).
 * Usage: node scripts/probe-club-invite-accept.mjs <guestEmail> <inviteId> <token>
 * Sans args: reprend la dernière invite club pending sur PADELINAS.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 1 || line.startsWith("#")) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const guestEmail = process.argv[2];
const inviteIdArg = process.argv[3];
const tokenArg = process.argv[4];
const clubId = "53b14428-3af2-4e78-b91d-bbe9d1b2f539";

let inviteId = inviteIdArg;
let token = tokenArg;

if (!inviteId || !token) {
  const { data: invites } = await admin
    .from("booking_participant_invites")
    .select("id, booking_id, seat_index, status, invite_source")
    .eq("invite_source", "club")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("pending club invites:", JSON.stringify(invites?.map((i) => ({ id: i.id, seat: i.seat_index, booking: i.booking_id })), null, 2));

  const bookingId = invites?.[0]?.booking_id;
  inviteId = invites?.[0]?.id;

  if (bookingId && inviteId) {
    const { data: staffUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
    const staff = staffUsers?.users?.find((u) => u.email === "kifpadel216@gmail.com");
    if (staff) {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email: staff.email });
      const { data: sessionData } = await anon.auth.verifyOtp({
        type: "magiclink",
        token_hash: linkData.properties.hashed_token,
      });
      const staffClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await staffClient.auth.setSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      });
      const { data: refreshed } = await staffClient.rpc("refresh_club_booking_split_invite_links", {
        p_booking_id: bookingId,
      });
      const row = (refreshed ?? []).find((r) => r.invite_id === inviteId);
      token = row?.invite_token;
      console.log("token regen pour invite", inviteId, "len:", token?.length ?? 0);
    }
  }
}

if (!guestEmail || !inviteId || !token) {
  console.error("Usage: node scripts/probe-club-invite-accept.mjs guest@email.com [inviteId] [token]");
  process.exit(1);
}

const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
const guest = users?.users?.find((u) => u.email?.toLowerCase() === guestEmail.toLowerCase());
if (!guest) {
  console.error("Guest introuvable:", guestEmail);
  process.exit(1);
}

console.log("\n=== Accept invite ===", { guest: guest.email, inviteId, tokenLen: token.length });

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: guest.email,
});
if (linkErr) {
  console.error(linkErr.message);
  process.exit(1);
}

const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
  type: "magiclink",
  token_hash: linkData.properties.hashed_token,
});
if (otpErr) {
  console.error(otpErr.message);
  process.exit(1);
}

const guestClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
await guestClient.auth.setSession({
  access_token: sessionData.session.access_token,
  refresh_token: sessionData.session.refresh_token,
});

const { data, error } = await guestClient.rpc("accept_booking_invite_atomic", {
  p_invite_id: inviteId,
  p_raw_token: token,
  p_payment_method: "on_site",
});

console.log("error:", error?.message ?? "none");
console.log("result:", JSON.stringify(data, null, 2));

const row = Array.isArray(data) ? data[0] : data;
if (!row?.ok) {
  process.exit(1);
}

const { data: inviteRow } = await admin
  .from("booking_participant_invites")
  .select("status, accepted_by")
  .eq("id", inviteId)
  .maybeSingle();
console.log("invite DB:", JSON.stringify(inviteRow, null, 2));

const { data: part } = await admin
  .from("booking_participants")
  .select("id, player_id, seat_index, payment_method, status")
  .eq("booking_id", row.booking_id)
  .eq("player_id", guest.id)
  .maybeSingle();
console.log("participant:", JSON.stringify(part, null, 2));

console.log("\n✓ Acceptation invitation club OK");
console.log("URL:", `https://www.kifpadel.tn/fr/bookings/invite/${inviteId}?t=${encodeURIComponent(token).slice(0, 20)}...`);
