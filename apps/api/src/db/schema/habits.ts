import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { HABIT_FREQUENCIES } from '@hop/domain';

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  frequency: text('frequency', { enum: HABIT_FREQUENCIES }).notNull().default('daily'),
  targetPerWeek: integer('target_per_week').notNull().default(7),
  goalId: text('goal_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
