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

const userId = process.argv[2] ?? "0172dbee-bc9f-44a4-a216-c7c942e952e2";
const bookingIdArg = process.argv[3];

const emailFromArgv = process.argv[4];
const clubId = "53b14428-3af2-4e78-b91d-bbe9d1b2f539";

// Table / column probes
for (const table of ["booking_participant_invites", "booking_participants", "bookings"]) {
  const { error } = await admin.from(table).select("*").limit(1);
  console.log(`table ${table}:`, error?.message ?? "ok");
}

const { data: cols } = await admin.from("bookings").select("*").eq("club_id", clubId).limit(1);
if (cols?.[0]) {
  console.log("bookings columns:", Object.keys(cols[0]).join(", "));
}

// Find booking ~22/06/2026 07:00
const { data: bookings, error: bErr } = await admin
  .from("bookings")
  .select("id, starts_at, status, club_id, total_price")
  .eq("club_id", clubId)
  .gte("starts_at", "2026-06-22T05:00:00Z")
  .lte("starts_at", "2026-06-22T09:00:00Z")
  .order("starts_at");

console.log("\nbookings on 22/06:", bErr?.message ?? JSON.stringify(bookings, null, 2));

const bookingId = bookingIdArg ?? bookings?.[0]?.id;
if (!bookingId) {
  console.log("No booking found for probe");
  process.exit(0);
}

const { data: parts } = await admin
  .from("booking_participants")
  .select("id, player_id, seat_index, share_price, payment_method, status")
  .eq("booking_id", bookingId);
console.log("\nparticipants:", JSON.stringify(parts, null, 2));

let email = emailFromArgv;
if (!email) {
  const { data: profile } = await admin.from("profiles").select("email").eq("user_id", userId).maybeSingle();
  email = profile?.email;
}
if (!email) {
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  email = authUser?.user?.email;
}
if (!email) {
  console.error("No email for user", userId);
  process.exit(1);
}
console.log("auth as:", email, userId);

const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email });
const { data: sessionData } = await anon.auth.verifyOtp({
  type: "magiclink",
  token_hash: linkData.properties.hashed_token,
});
const authed = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
await authed.auth.setSession({
  access_token: sessionData.session.access_token,
  refresh_token: sessionData.session.refresh_token,
});

const { data, error } = await authed.rpc("create_booking_split_invites", {
  p_booking_id: bookingId,
});
console.log("\ncreate_booking_split_invites:");
console.log("error:", error?.message ?? "none");
console.log("data:", JSON.stringify(data, null, 2));
