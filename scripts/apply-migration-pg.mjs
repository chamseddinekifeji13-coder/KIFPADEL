import { readFileSync } from "node:fs";
import pg from "pg";

const migrationFile = process.argv[2] ?? "supabase/migrations/20260630120000_player_avatars_storage.sql";

const env = {};
for (const line of readFileSync(".env.vercel.prod", "utf8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx < 1) continue;
  let val = line.slice(idx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  env[line.slice(0, idx)] = val;
}

const sql = readFileSync(migrationFile, "utf8");
const client = new pg.Client({
  connectionString: env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log("Migration applied OK:", migrationFile);
} finally {
  await client.end();
}
