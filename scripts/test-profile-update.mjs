import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.vercel.prod", "utf8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx < 1) continue;
  let val = line.slice(idx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  env[line.slice(0, idx)] = val;
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const userId = "0172dbee-bc9f-44a4-a216-c7c942e952e2";

const withLevel = await admin
  .from("profiles")
  .update({
    phone_e164: "+21620403574",
    phone_verified_at: new Date().toISOString(),
    verification_level: 2,
  })
  .eq("id", userId);

console.log("with verification_level:", withLevel.error?.message ?? "ok");

const withoutLevel = await admin
  .from("profiles")
  .update({
    phone: "20403574",
    phone_e164: "+21620403574",
    phone_verified_at: new Date().toISOString(),
  })
  .eq("id", userId);

console.log("without verification_level:", withoutLevel.error?.message ?? "ok");
