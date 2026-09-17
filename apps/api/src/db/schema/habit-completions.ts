import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const habitCompletions = sqliteTable('habit_completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull(),
  date: text('date').notNull(),
  completedAt: text('completed_at').notNull(),
}, (table) => ({
  habitDate: primaryKey({ columns: [table.habitId, table.date] }),
}));
