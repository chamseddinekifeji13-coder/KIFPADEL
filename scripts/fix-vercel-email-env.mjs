#!/usr/bin/env node
/**
 * Réécrit les secrets Vercel sans \\r\\n parasites (bug PowerShell pipe).
 * Lit .env.vercel.check ou variables d'environnement locales.
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val.replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
  }
  return out;
}

const fileEnv = parseEnvFile(resolve(process.cwd(), ".env.vercel.check"));

const productionVars = {
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? fileEnv.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? fileEnv.RESEND_FROM_EMAIL ?? "notifications@kifpadel.tn",
  PHONE_VERIFICATION_CHANNEL: "email",
  KIF_WALLET_AUTO_COMPLETE_TOPUP: "false",
  NEXT_PUBLIC_SITE_URL: "https://www.kifpadel.tn",
};

function setEnv(name, value) {
  if (!value) {
    console.warn(`skip ${name} (empty)`);
    return;
  }
  try {
    execSync(`npx vercel env rm ${name} production -y`, { stdio: "pipe" });
  } catch {
    // may not exist
  }
  const result = spawnSync("npx", ["vercel", "env", "add", name, "production"], {
    input: value,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`✗ ${name}`, result.stderr || result.stdout);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${name}`);
}

for (const [name, value] of Object.entries(productionVars)) {
  setEnv(name, value);
}

console.log("\nTerminé. Lance: npx vercel --prod");
