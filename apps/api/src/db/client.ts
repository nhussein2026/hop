import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/node-sqlite';

import { resolveDatabasePath, resolveMigrationsFolder } from '../config.js';
import { migrateDatabase } from './migrate.js';

const databasePath = resolveDatabasePath();

mkdirSync(dirname(databasePath), {
  recursive: true,
});

const sqlite = new DatabaseSync(databasePath);

sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA busy_timeout = 5000;');
migrateDatabase(sqlite, resolveMigrationsFolder());

export const db = drizzle({
  client: sqlite,
});