import { DatabaseSync } from 'node:sqlite';

import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import type { BackupSnapshot, BackupTable } from '@hop/validation';

import { resolveMigrationsFolder } from '../config.js';
import { db } from '../db/client.js';
import { migrateDatabase } from '../db/migrate.js';
import {
  contacts,
  events,
  evidence,
  goalCriteria,
  goalProgress,
  goals,
  habitCompletions,
  habits,
  interactions,
  milestones,
  opportunities,
  opportunityActivities,
  opportunityPrep,
  projects,
  reflections,
  resumeFiles,
  resumes,
  settings,
  skills,
  tasks,
  weeklyReviews,
} from '../db/schema/index.js';

const tables = {
  goals,
  tasks,
  habits,
  habitCompletions,
  events,
  opportunities,
  projects,
  skills,
  evidence,
  weeklyReviews,
  goalCriteria,
  goalProgress,
  milestones,
  opportunityPrep,
  opportunityActivities,
  contacts,
  interactions,
  resumes,
  resumeFiles,
  reflections,
  settings,
} satisfies Record<BackupTable, unknown>;

type Database = typeof db;

// Keeps each INSERT well under SQLite's limit on bound parameters.
const insertBatchSize = 100;

// Blobs cannot go into JSON as they are, so file contents travel as base64.
function toSnapshotRows(name: BackupTable, rows: Record<string, unknown>[]) {
  return name === 'resumeFiles' ? rows.map((row) => ({ ...row, data: Buffer.from(row.data as Uint8Array).toString('base64') })) : rows;
}

function toTableRows(name: BackupTable, rows: Record<string, unknown>[]) {
  return name === 'resumeFiles' ? rows.map((row) => ({ ...row, data: Buffer.from(row.data as string, 'base64') })) : rows;
}

function readAll(source: Database) {
  return Object.fromEntries(
    (Object.entries(tables) as [BackupTable, (typeof tables)[BackupTable]][]).map(([name, table]) => [name, toSnapshotRows(name, source.select().from(table).all())]),
  ) as Omit<BackupSnapshot, 'version' | 'exportedAt'>;
}

function replaceAll(target: Database, snapshot: BackupSnapshot) {
  target.transaction((tx) => {
    for (const table of Object.values(tables)) {
      tx.delete(table).run();
    }

    for (const [name, table] of Object.entries(tables) as [BackupTable, (typeof tables)[BackupTable]][]) {
      const rows = toTableRows(name, snapshot[name]);

      for (let start = 0; start < rows.length; start += insertBatchSize) {
        // Each snapshot row matches its table's columns; the union type cannot express that pairing.
        tx.insert(table).values(rows.slice(start, start + insertBatchSize) as never).run();
      }
    }
  });
}

function countAll(source: Database): Record<BackupTable, number> {
  return Object.fromEntries(
    (Object.entries(tables) as [BackupTable, (typeof tables)[BackupTable]][]).map(([name, table]) => [name, source.select({ rows: count() }).from(table).get()?.rows ?? 0]),
  ) as Record<BackupTable, number>;
}

export const backupRepository = {
  readAllTables() {
    return readAll(db);
  },

  countRows(): Record<BackupTable, number> {
    return countAll(db);
  },

  /** Replace every data table with the snapshot's rows. All or nothing: any failure rolls back. */
  replaceAllTables(snapshot: BackupSnapshot) {
    replaceAll(db, snapshot);
  },

  /** Load a snapshot into a new, empty in-memory database and count what arrived. The real data is never touched. */
  restoreIntoScratch(snapshot: BackupSnapshot): Record<BackupTable, number> {
    const sqlite = new DatabaseSync(':memory:');

    try {
      migrateDatabase(sqlite, resolveMigrationsFolder());
      const scratch = drizzle({ client: sqlite }) as unknown as Database;
      replaceAll(scratch, snapshot);
      return countAll(scratch);
    } finally {
      sqlite.close();
    }
  },
};
