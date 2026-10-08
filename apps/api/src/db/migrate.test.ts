import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { resolveMigrationsFolder } from '../config.js';
import { migrateDatabase } from './migrate.js';

const migrationsFolder = resolveMigrationsFolder();
const legacySchema = readFileSync(new URL('./fixtures/legacy-schema.sql', import.meta.url), 'utf8');

function tableNames(sqlite: DatabaseSync) {
  return sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
}

function appliedMigrations(sqlite: DatabaseSync) {
  return sqlite.prepare('SELECT name FROM __drizzle_migrations ORDER BY id').all().map((row) => row.name);
}

test('migrateDatabase creates every table in a new database and is idempotent', () => {
  const sqlite = new DatabaseSync(':memory:');

  migrateDatabase(sqlite, migrationsFolder);
  migrateDatabase(sqlite, migrationsFolder);

  assert.deepEqual(tableNames(sqlite), [
    '__drizzle_migrations',
    'contacts',
    'credentials',
    'events',
    'evidence',
    'goal_criteria',
    'goal_progress',
    'goals',
    'habit_completions',
    'habits',
    'interactions',
    'milestones',
    'opportunities',
    'opportunity_activities',
    'opportunity_prep',
    'projects',
    'reflections',
    'resume_files',
    'resumes',
    'sessions',
    'settings',
    'skills',
    'tasks',
    'weekly_reviews',
  ]);
  assert.equal(appliedMigrations(sqlite).length, 4);
});

test('migrateDatabase baselines a pre-migration database without touching its data', () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(legacySchema);
  sqlite.exec("INSERT INTO goals (id, name, created_at, updated_at) VALUES ('goal-1', 'Kept goal', '2026-01-01', '2026-01-01')");

  migrateDatabase(sqlite, migrationsFolder);

  // The initial migration is recorded without running; later migrations still apply.
  assert.deepEqual(appliedMigrations(sqlite).map((name) => String(name).slice(15)), ['initial', 'auth', 'features', 'resume_files_goal_criteria']);
  assert.deepEqual(sqlite.prepare('SELECT name FROM goals').all().map((row) => row.name), ['Kept goal']);
});

test('migrateDatabase refuses to baseline a database with only some legacy tables', () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE tasks (id TEXT PRIMARY KEY)');

  assert.throws(() => migrateDatabase(sqlite, migrationsFolder), /missing: goals/);
});
