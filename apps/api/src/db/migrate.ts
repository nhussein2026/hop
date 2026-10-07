import type { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/node-sqlite';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

const migrationsTable = '__drizzle_migrations';

/** Tables created by the hand-written bootstrap that predates migrations. */
const legacyTables = [
  'goals',
  'tasks',
  'opportunities',
  'skills',
  'projects',
  'evidence',
  'weekly_reviews',
  'habits',
  'habit_completions',
  'events',
];

function tableExists(sqlite: DatabaseSync, name: string) {
  return sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;
}

/**
 * Databases created before Hop used migrations already contain the initial schema.
 * Record the initial migration as applied so it is not run against existing tables.
 */
function baselineLegacyDatabase(sqlite: DatabaseSync, migrationsFolder: string) {
  if (tableExists(sqlite, migrationsTable)) {
    return;
  }

  const existing = legacyTables.filter((name) => tableExists(sqlite, name));

  if (existing.length === 0) {
    return;
  }

  if (existing.length !== legacyTables.length) {
    const missing = legacyTables.filter((name) => !existing.includes(name));
    throw new Error(`Cannot baseline the database: expected all legacy tables, but these are missing: ${missing.join(', ')}`);
  }

  const [initial] = readMigrationFiles({ migrationsFolder });

  if (!initial) {
    throw new Error(`No migrations found in ${migrationsFolder}`);
  }

  // Same shape drizzle creates, so its migrator treats this as an up-to-date migrations table.
  sqlite.exec(`
    CREATE TABLE ${migrationsTable} (
      id INTEGER PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric,
      name text,
      applied_at TEXT
    );
  `);
  sqlite
    .prepare(`INSERT INTO ${migrationsTable} (hash, created_at, name, applied_at) VALUES (?, ?, ?, ?)`)
    .run(initial.hash, initial.folderMillis, initial.name, new Date().toISOString());
}

/** Bring the database schema up to date. Runs every pending migration in one transaction. */
export function migrateDatabase(sqlite: DatabaseSync, migrationsFolder: string) {
  baselineLegacyDatabase(sqlite, migrationsFolder);
  migrate(drizzle({ client: sqlite }), { migrationsFolder });
}
