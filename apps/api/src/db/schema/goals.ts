import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

import { GOAL_PRIORITIES, GOAL_STATUSES } from '@hop/domain';

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  why: text('why'),
  areaId: text('area_id'),
  status: text('status', { enum: GOAL_STATUSES }).notNull().default('active'),
  priority: text('priority', { enum: GOAL_PRIORITIES }).notNull().default('medium'),
  startDate: text('start_date'),
  targetDate: text('target_date'),
  successCriteria: text('success_criteria'),
  progress: integer('progress').notNull().default(0),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
});
