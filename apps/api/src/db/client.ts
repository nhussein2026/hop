import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/node-sqlite';

const databasePath = fileURLToPath(
  new URL('../../../../storage/hop.db', import.meta.url),
);

mkdirSync(dirname(databasePath), {
  recursive: true,
});

const sqlite = new DatabaseSync(databasePath);

sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle({
  client: sqlite,
});