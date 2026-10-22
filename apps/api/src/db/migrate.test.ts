import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    'accounts',
    'assessments',
    'book_loans',
    'books',
    'contacts',
    'courses',
    'credentials',
    'events',
    'evidence',
    'finds',
    'goal_criteria',
    'goal_progress',
    'goals',
    'habit_completions',
    'habits',
    'ideas',
    'interactions',
    'key_dates',
    'milestones',
    'monthly_reviews',
    'opportunities',
    'opportunity_activities',
    'opportunity_prep',
    'pins',
    'practice_activities',
    'practice_sessions',
    'practice_tests',
    'projects',
    'reading_log',
    'reflections',
    'resource_files',
    'resources',
    'resume_files',
    'resumes',
    'sessions',
    'settings',
    'skills',
    'tasks',
    'terms',
    'uni_links',
    'weekly_reviews',
  ]);
  assert.equal(appliedMigrations(sqlite).length, 10);
});

test('migrateDatabase baselines a pre-migration database without touching its data', () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(legacySchema);
  sqlite.exec("INSERT INTO goals (id, name, created_at, updated_at) VALUES ('goal-1', 'Kept goal', '2026-01-01', '2026-01-01')");

  migrateDatabase(sqlite, migrationsFolder);

  // The initial migration is recorded without running; later migrations still apply.
  assert.deepEqual(appliedMigrations(sqlite).map((name) => String(name).slice(15)), ['initial', 'auth', 'features', 'resume_files_goal_criteria', 'monthly_reviews', 'university_and_radar', 'reading_shelf', 'language_track', 'notes_and_accounts', 'proven_skills']);
  assert.deepEqual(sqlite.prepare('SELECT name FROM goals').all().map((row) => row.name), ['Kept goal']);
});

test('migrateDatabase refuses to baseline a database with only some legacy tables', () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE tasks (id TEXT PRIMARY KEY)');

  assert.throws(() => migrateDatabase(sqlite, migrationsFolder), /missing: goals/);
});

test('the proven-skills migration keeps old ratings and marks books read as learning, not proof', () => {
  const earlier = mkdtempSync(join(tmpdir(), 'hop-migrations-'));
  const sqlite = new DatabaseSync(':memory:');

  try {
    for (const name of readdirSync(migrationsFolder).filter((name) => !name.endsWith('_proven_skills'))) {
      cpSync(join(migrationsFolder, name), join(earlier, name), { recursive: true });
    }
    migrateDatabase(sqlite, earlier);
    sqlite.exec("INSERT INTO skills (id, name, category, level, confidence, created_at, updated_at) VALUES ('s1', 'React', 'Software engineering', 'confident', 7, '2026-01-01', '2026-01-01')");
    sqlite.exec(`INSERT INTO evidence (id, title, skill_ids, date, created_at, updated_at) VALUES
      ('e1', 'Read “Clean Code” by Robert C. Martin', '["s1"]', '2026-10-01', '2026-10-01', '2026-10-01'),
      ('e2', 'Deployed the Hop API', '["s1"]', '2026-10-02', '2026-10-02', '2026-10-02')`);

    migrateDatabase(sqlite, migrationsFolder);

    const skill = { ...sqlite.prepare('SELECT name, category, level, confidence, type, focus, listed, bar FROM skills').get() };
    assert.deepEqual(skill, { name: 'React', category: 'Software engineering', level: 'confident', confidence: 7, type: 'tool', focus: 'keep', listed: 0, bar: null });
    assert.deepEqual(sqlite.prepare('SELECT id, kind FROM evidence ORDER BY id').all().map((row) => [row.id, row.kind]), [['e1', 'learned'], ['e2', null]]);

    // Skills added from now on have no self-assessed level.
    sqlite.exec("INSERT INTO skills (id, name, created_at, updated_at) VALUES ('s2', 'Rust', '2026-10-22', '2026-10-22')");
    assert.equal(sqlite.prepare("SELECT level FROM skills WHERE id = 's2'").get()?.level, null);
  } finally {
    sqlite.close();
    rmSync(earlier, { recursive: true, force: true });
  }
});
