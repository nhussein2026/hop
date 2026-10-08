import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const goalCriteria = sqliteTable('goal_criteria', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  text: text('text').notNull(),
  note: text('note'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** A goal's progress on a local date, recorded when its criteria change. One row per goal per day. */
export const goalProgress = sqliteTable('goal_progress', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  date: text('date').notNull(),
  progress: integer('progress').notNull(),
}, (table) => [
  unique('goal_progress_goal_id_date_unique').on(table.goalId, table.date),
]);
