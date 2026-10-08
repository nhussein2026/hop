import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { HABIT_FREQUENCIES } from '@hop/domain';

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  frequency: text('frequency', { enum: HABIT_FREQUENCIES }).notNull().default('daily'),
  targetPerWeek: integer('target_per_week').notNull().default(7),
  goalId: text('goal_id'),
  days: text('days', { mode: 'json' }).$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
  minutes: integer('minutes').notNull().default(30),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
