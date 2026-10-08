import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { WEEKLY_REVIEW_STATUSES } from '@hop/domain';
import type { WeekFacts } from '@hop/domain';

export const weeklyReviews = sqliteTable('weekly_reviews', {
  id: text('id').primaryKey(),
  weekStart: text('week_start').notNull(),
  wins: text('wins').notNull().default(''),
  progress: text('progress').notNull().default(''),
  career: text('career').notNull().default(''),
  learning: text('learning').notNull().default(''),
  projects: text('projects').notNull().default(''),
  problems: text('problems').notNull().default(''),
  nextWeek: text('next_week').notNull().default(''),
  energy: integer('energy'),
  focus: integer('focus'),
  change: text('change_note').notNull().default(''),
  topThree: text('top_three', { mode: 'json' }).$type<string[]>().notNull().default([]),
  status: text('status', { enum: WEEKLY_REVIEW_STATUSES }).notNull().default('draft'),
  facts: text('facts', { mode: 'json' }).$type<WeekFacts>(),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
