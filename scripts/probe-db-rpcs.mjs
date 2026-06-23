import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const env = {};
for (const line of readFileSync(".env.vercel.prod", "utf8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx < 1) continue;
  let val = line.slice(idx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  env[line.slice(0, idx).trim()] = val;
}

console.log("POSTGRES_HOST:", env.POSTGRES_HOST);
console.log("POSTGRES_USER:", env.POSTGRES_USER);
console.log("POSTGRES_DATABASE:", env.POSTGRES_DATABASE);
console.log("PROJECT:", env.NEXT_PUBLIC_SUPABASE_PROJECT_ID);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const rpcs = [
  "create_club_booking_split_invites",
  "refresh_club_booking_split_invite_links",
  "refresh_booking_split_invite_links",
  "create_booking_split_invites",
  "accept_booking_invite_atomic",
];
for (const rpc of rpcs) {
  const { error } = await admin.rpc(rpc, { p_booking_id: "00000000-0000-0000-0000-000000000001" });
  const msg = error?.message ?? "ok";
  console.log("rpc", rpc + ":", msg.slice(0, 80));
}

// try non-pooling url
for (const key of ["POSTGRES_URL_NON_POOLING", "POSTGRES_URL"]) {
  const url = env[key];
  if (!url) continue;
  const host = url.replace(/:([^:@/]+)@/, ":***@").slice(0, 120);
  console.log("\nTrying", key, host + "...");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query("SELECT to_regclass('public.booking_participant_invites') AS t");
    console.log(key, "booking_participant_invites:", r.rows[0]?.t ?? "MISSING");
    const r2 = await client.query("SELECT proname FROM pg_proc JOIN pg_namespace n ON n.oid=pronamespace WHERE n.nspname='public' AND proname LIKE '%club_booking%'");
    console.log(key, "club rpcs:", r2.rows.map(x=>x.proname).join(", ") || "none");
    await client.end();
  } catch (e) {
    console.log(key, "error:", e.message.slice(0, 100));
  }
}
