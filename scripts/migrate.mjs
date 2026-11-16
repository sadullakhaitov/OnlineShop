// Applies pending SQL migrations from ./drizzle to the PostgreSQL database in
// DATABASE_URL. Runs before every build; without DATABASE_URL it does nothing,
// because the embedded local database migrates itself on first use.
import path from "node:path";
import process from "node:process";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Next.js reads these files by itself; this script runs outside of it.
// Variables that are already set win, and so does the first file.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // The file does not exist: nothing to read.
  }
}

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("db:migrate: DATABASE_URL is not set, nothing to do.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });

try {
  await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("db:migrate: database is up to date.");
} catch (error) {
  console.error("db:migrate: failed.", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
