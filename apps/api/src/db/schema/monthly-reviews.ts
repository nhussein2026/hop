import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { MONTHLY_REVIEW_STATUSES } from '@hop/domain';
import type { MonthFacts } from '@hop/domain';

export const monthlyReviews = sqliteTable('monthly_reviews', {
  id: text('id').primaryKey(),
  monthStart: text('month_start').notNull().unique(),
  highlights: text('highlights').notNull().default(''),
  keep: text('keep').notNull().default(''),
  stop: text('stop').notNull().default(''),
  change: text('change_note').notNull().default(''),
  focus: text('focus', { mode: 'json' }).$type<string[]>().notNull().default([]),
  status: text('status', { enum: MONTHLY_REVIEW_STATUSES }).notNull().default('draft'),
  facts: text('facts', { mode: 'json' }).$type<MonthFacts>(),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
