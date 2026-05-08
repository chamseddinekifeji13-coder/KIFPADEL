/**
 * Apply a migration file to the DB pointed by STAGING_DATABASE_URL,
 * or parse POSTGRES_URL_NON_POOLING from sync-env.cjs (local dev bootstrap only).
 * Do not commit real URLs; set STAGING_DATABASE_URL in CI instead.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadStagingDbUrl() {
  const fromEnv = process.env.STAGING_DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;

  const syncEnvPath = path.join(root, "sync-env.cjs");
  if (!fs.existsSync(syncEnvPath)) {
    throw new Error(
      "Set STAGING_DATABASE_URL or add sync-env.cjs with POSTGRES_URL_NON_POOLING for local apply.",
    );
  }
  const text = fs.readFileSync(syncEnvPath, "utf8");
  const m = text.match(/POSTGRES_URL_NON_POOLING:\s*"([^"]+)"/);
  if (!m?.[1]) throw new Error("Could not parse POSTGRES_URL_NON_POOLING from sync-env.cjs");
  return m[1];
}

function sanitizeConnectionString(url) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

async function main() {
  const url = sanitizeConnectionString(loadStagingDbUrl());
  const migrationPath = path.join(
    root,
    "supabase/migrations/20260508103000_bookings_payment_trust_booking_ref.sql",
  );
  const sql = fs.readFileSync(migrationPath, "utf8");

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration SQL executed successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
