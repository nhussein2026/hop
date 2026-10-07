import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const habitCompletions = sqliteTable('habit_completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull(),
  date: text('date').notNull(),
  completedAt: text('completed_at').notNull(),
}, (table) => [
  // A habit can be completed at most once per local date.
  unique('habit_completions_habit_id_date_unique').on(table.habitId, table.date),
]);
