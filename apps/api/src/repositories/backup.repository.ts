import type { BackupSnapshot, BackupTable } from '@hop/validation';

import { db } from '../db/client.js';
import {
  events,
  evidence,
  goals,
  habitCompletions,
  habits,
  opportunities,
  projects,
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
} satisfies Record<BackupTable, unknown>;

// Keeps each INSERT well under SQLite's limit on bound parameters.
const insertBatchSize = 100;

export const backupRepository = {
  readAllTables() {
    return {
      goals: db.select().from(goals).all(),
      tasks: db.select().from(tasks).all(),
      habits: db.select().from(habits).all(),
      habitCompletions: db.select().from(habitCompletions).all(),
      events: db.select().from(events).all(),
      opportunities: db.select().from(opportunities).all(),
      projects: db.select().from(projects).all(),
      skills: db.select().from(skills).all(),
      evidence: db.select().from(evidence).all(),
      weeklyReviews: db.select().from(weeklyReviews).all(),
    };
  },

  countRows(): Record<BackupTable, number> {
    const all = this.readAllTables();
    return Object.fromEntries(Object.entries(all).map(([table, rows]) => [table, rows.length])) as Record<BackupTable, number>;
  },

  /** Replace every data table with the snapshot's rows. All or nothing: any failure rolls back. */
  replaceAllTables(snapshot: BackupSnapshot) {
    db.transaction((tx) => {
      for (const table of Object.values(tables)) {
        tx.delete(table).run();
      }

      for (const [name, table] of Object.entries(tables) as [BackupTable, (typeof tables)[BackupTable]][]) {
        const rows = snapshot[name];

        for (let start = 0; start < rows.length; start += insertBatchSize) {
          // Each snapshot row matches its table's columns; the union type cannot express that pairing.
          tx.insert(table).values(rows.slice(start, start + insertBatchSize) as never).run();
        }
      }
    });
  },
};
