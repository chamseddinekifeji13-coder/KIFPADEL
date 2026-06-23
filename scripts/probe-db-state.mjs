import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const env = {};
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const idx = line.indexOf("=");
      if (idx < 1 || line.startsWith("#")) continue;
      let val = line.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      env[line.slice(0, idx).trim()] = val;
    }
  } catch { return null; }
  return env;
}

for (const file of [".env.vercel.prod", ".env.local"]) {
  const env = loadEnv(file);
  if (!env?.NEXT_PUBLIC_SUPABASE_URL) { console.log(file, ": missing supabase url"); continue; }
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY);
  console.log("\n===", file, "===", env.NEXT_PUBLIC_SUPABASE_URL);
  for (const table of ["booking_participant_invites", "profiles", "bookings"]) {
    const { error } = await admin.from(table).select("*").limit(1);
    console.log(" ", table + ":", error?.message ?? "ok");
  }
  const { error: colErr } = await admin.from("profiles").select("avatar_url").limit(1);
  console.log("  profiles.avatar_url:", colErr?.message ?? "ok");
  const { error: srcErr } = await admin.from("booking_participant_invites").select("invite_source").limit(1);
  console.log("  invite_source col:", srcErr?.message ?? "ok");
}
