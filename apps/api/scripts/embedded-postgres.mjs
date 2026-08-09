/**
 * Local Postgres helper when Docker is unavailable.
 * Starts an embedded PostgreSQL instance for migrate/seed/dev.
 *
 * Usage: npm run db:embedded -w apps/api
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, '..', '.data', 'pg');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'govflow',
    password: 'govflow',
    port: 5432,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  const alreadyInitialized = await exists(path.join(databaseDir, 'PG_VERSION'));
  if (!alreadyInitialized) {
    console.log(`Initialising embedded Postgres in ${databaseDir}...`);
    await pg.initialise();
  } else {
    console.log(`Using existing Postgres data directory ${databaseDir}`);
  }

  await pg.start();

  try {
    await pg.createDatabase('govflow');
    console.log('Created database govflow');
  } catch {
    console.log('Database govflow already exists (ok)');
  }

  console.log(
    'Embedded Postgres is running on postgresql://govflow:govflow@localhost:5432/govflow',
  );
  console.log('Keep this process running. Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('Stopping embedded Postgres...');
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
