import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const taskCompletions = sqliteTable('task_completions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  date: text('date').notNull(),
  skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at').notNull(),
}, (table) => [
  // One record per occurrence: ticked done, or skipped.
  unique('task_completions_task_id_date_unique').on(table.taskId, table.date),
]);
