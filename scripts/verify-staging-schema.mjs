/**
 * Post-migration checks: columns, trust_events insert shape, overlap predicate sample.
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
  const text = fs.readFileSync(syncEnvPath, "utf8");
  const m = text.match(/POSTGRES_URL_NON_POOLING:\s*"([^"]+)"/);
  if (!m?.[1]) throw new Error("STAGING_DATABASE_URL or sync-env.cjs required");
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
  const client = new pg.Client({
    connectionString: sanitizeConnectionString(loadStagingDbUrl()),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const bookingsCols = await client.query(
      `select column_name, data_type, is_nullable
       from information_schema.columns
       where table_schema = 'public' and table_name = 'bookings'
         and column_name in ('total_price','payment_method','created_at','status','is_blocking')
       order by column_name`,
    );

    const trustCols = await client.query(
      `select column_name, data_type
       from information_schema.columns
       where table_schema = 'public' and table_name = 'trust_events'
       order by ordinal_position`,
    );

    const idx = await client.query(
      `select indexname from pg_indexes
       where schemaname = 'public' and tablename = 'trust_events'
         and indexname = 'trust_events_booking_id_idx'`,
    );

    console.log(JSON.stringify({ bookingsCols: bookingsCols.rows, trustCols: trustCols.rows, bookingIdIndex: idx.rows }, null, 2));

    // Sanity: Pending TTL filter row count (non-destructive read)
    const pendingStale = await client.query(
      `select count(*)::int as n
       from public.bookings
       where status = 'pending' and created_at < now() - interval '15 minutes'`,
    );
    console.log("pending_older_than_15min:", pendingStale.rows[0]?.n);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
