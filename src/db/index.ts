import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * One database handle for the whole server.
 *
 * - With `DATABASE_URL` it talks to a normal PostgreSQL server (hosting).
 *   Migrations are applied by `npm run db:migrate`, which the build runs.
 * - Without it, an embedded PostgreSQL (PGlite) keeps its files in `.data/`
 *   and migrates itself, so the site runs locally with no setup at all.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** The handle inside `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const MIGRATIONS = path.join(process.cwd(), "drizzle");

// Kept on globalThis so that hot reloads and separate route bundles share it.
const store = globalThis as unknown as { __multimediaDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  store.__multimediaDb ??= connect().catch((error) => {
    store.__multimediaDb = undefined;
    throw error;
  });
  return store.__multimediaDb;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 5 });
    return drizzle(pool, { schema }) as unknown as Db;
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Serverless hosts have no disk to keep the embedded database on.
    throw new Error("DATABASE_URL is not set: orders and accounts need a PostgreSQL database on this host.");
  }

  return createLocalDb(path.join(process.cwd(), ".data", "pglite"));
}

/** Embedded database; without `dataDir` it lives in memory (used by tests). */
export async function createLocalDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  if (dataDir) await mkdir(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

export { schema };
