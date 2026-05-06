const { execSync } = require('child_process');

const envs = {
  NEXT_PUBLIC_SUPABASE_URL: "https://oimxfkkhobduqmgnsffx.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXhma2tob2JkdXFtZ25zZmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc0NTksImV4cCI6MjA5MjYyMzQ1OX0.I68EexJ27ASRa9ISNE5vRI8Occ9n7R3TIE8-1gsv3CE",
  NEXT_PUBLIC_SUPABASE_PROJECT_ID: "oimxfkkhobduqmgnsffx",
  SUPABASE_URL: "https://oimxfkkhobduqmgnsffx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXhma2tob2JkdXFtZ25zZmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc0NTksImV4cCI6MjA5MjYyMzQ1OX0.I68EexJ27ASRa9ISNE5vRI8Occ9n7R3TIE8-1gsv3CE",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXhma2tob2JkdXFtZ25zZmZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0NzQ1OSwiZXhwIjoyMDkyNjIzNDU5fQ.k-xrPJZHAJeFipl8VEjkU6kaz4rRBkeH6T-rMeMOebE",
  SUPABASE_JWT_SECRET: "Z6oKyZFNnPoIbJEB1CsY/Eitx58wILD7mRGSwvzz5QF870Ns83TroTXv7KIo74ru1zgKq7bWoyGD1nAtAMro5A==",
  POSTGRES_URL: "postgres://postgres.oimxfkkhobduqmgnsffx:4d0sDRWeCi6RVk7N@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x",
  POSTGRES_PRISMA_URL: "postgres://postgres.oimxfkkhobduqmgnsffx:4d0sDRWeCi6RVk7N@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true",
  POSTGRES_URL_NON_POOLING: "postgres://postgres.oimxfkkhobduqmgnsffx:4d0sDRWeCi6RVk7N@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
  POSTGRES_USER: "postgres",
  POSTGRES_HOST: "db.oimxfkkhobduqmgnsffx.supabase.co",
  POSTGRES_PASSWORD: "4d0sDRWeCi6RVk7N",
  POSTGRES_DATABASE: "postgres"
};

const { spawnSync } = require('child_process');

const fs = require('fs');

for (const [key, value] of Object.entries(envs)) {
  console.log(`Setting ${key}...`);
  try {
    fs.writeFileSync('.tmp_env_val', value.trim());
    const valStream = fs.openSync('.tmp_env_val', 'r');

    // Set for Production
    const resProd = spawnSync('vercel', ['env', 'add', key, 'production', '--force'], {
      stdio: [valStream, 'pipe', 'pipe'],
      shell: true
    });
    console.log(`Prod: ${resProd.status === 0 ? 'Success' : 'Failed'}`);
    if (resProd.status !== 0) console.error(resProd.stderr.toString());
    
    // Set for Preview (all branches)
    const valStream2 = fs.openSync('.tmp_env_val', 'r'); // Need a new stream or reset
    const resPrev = spawnSync('vercel', ['env', 'add', key, 'preview', '--force', '--yes'], {
      stdio: [valStream2, 'pipe', 'pipe'],
      shell: true
    });
    console.log(`Prev: ${resPrev.status === 0 ? 'Success' : 'Failed'}`);
    if (resPrev.status !== 0) console.error(resPrev.stderr.toString());

    fs.closeSync(valStream);
    fs.closeSync(valStream2);
  } catch (err) {
    console.error(`Failed to set ${key}: ${err.message}`);
  }
}

if (fs.existsSync('.tmp_env_val')) fs.unlinkSync('.tmp_env_val');
