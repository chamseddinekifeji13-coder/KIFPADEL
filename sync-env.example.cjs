/**
 * Exemple de script de synchronisation env → Vercel.
 * Copiez vers sync-env.cjs (gitignored) et remplissez depuis vos secrets locaux.
 * NE JAMAIS committer de clés réelles.
 */
const { spawnSync } = require("child_process");

const envs = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

for (const [key, value] of Object.entries(envs)) {
  if (!value) {
    console.warn(`Skip ${key} (empty)`);
    continue;
  }
  spawnSync("npx", ["vercel", "env", "add", key, "production"], {
    stdio: "inherit",
    input: value,
  });
}
