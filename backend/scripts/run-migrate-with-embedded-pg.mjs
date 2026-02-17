/**
 * Runs Prisma migrations using an embedded PostgreSQL instance (no Docker required).
 * Usage: node scripts/run-migrate-with-embedded-pg.mjs
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(rootDir, 'data', 'embedded-pg'),
  user: 'postgres',
  password: 'postgres',
  port: 15432,
  persistent: false,
  onLog: (msg) => console.log('[pg]', msg),
  onError: (msg) => console.error('[pg err]', msg),
});

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: rootDir,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function main() {
  console.log('Starting embedded PostgreSQL...');
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('aimall');

  const databaseUrl = 'postgresql://postgres:postgres@127.0.0.1:15432/aimall?schema=public';
  console.log('Running Prisma migrate deploy...');
  await run('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL: databaseUrl });
  console.log('Running Prisma seed...');
  await run('npx', ['ts-node', 'prisma/seed.ts'], { DATABASE_URL: databaseUrl });

  await pg.stop();
  console.log('Done. Migrations and seed applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
