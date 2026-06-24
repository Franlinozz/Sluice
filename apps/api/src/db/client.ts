import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB = path.resolve(here, "../../.data/sluice.db");
const dbPath = process.env.DATABASE_PATH ?? DEFAULT_DB;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };

/** Apply generated migrations (idempotent). Call once on boot. */
export function runMigrations(): void {
  const migrationsFolder = path.resolve(here, "../../drizzle");
  migrate(db, { migrationsFolder });
}

export const databaseFile = dbPath;
