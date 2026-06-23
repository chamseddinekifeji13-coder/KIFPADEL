import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const { data: buckets } = await admin.storage.listBuckets();
if (!buckets?.some((b) => b.id === "player-avatars")) {
  const { error } = await admin.storage.createBucket("player-avatars", {
    public: true,
    fileSizeLimit: 2097152,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error) {
    console.error("createBucket failed", error.message);
  } else {
    console.log("Bucket player-avatars created");
  }
} else {
  console.log("Bucket player-avatars already exists");
}

const { error: columnProbe } = await admin.from("profiles").select("avatar_url").limit(1);
if (!columnProbe) {
  console.log("Column profiles.avatar_url already exists");
  process.exit(0);
}

if (!columnProbe.message.includes("avatar_url")) {
  console.error("Unexpected probe error:", columnProbe.message);
  process.exit(1);
}

const sql = readFileSync(
  "supabase/migrations/20260630120000_player_avatars_storage.sql",
  "utf8",
);
const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!dbUrl) {
  console.log("\nColumn profiles.avatar_url is missing.");
  console.log("Set SUPABASE_DB_URL (Supabase → Settings → Database → URI) then rerun:");
  console.log("  node scripts/ensure-avatar-schema.mjs");
  console.log("\nOr paste this SQL in the Supabase SQL Editor:\n");
  console.log(sql);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log("Migration applied on", url);
} finally {
  await client.end();
}
