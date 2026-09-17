import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { EVENT_TYPES } from '@hop/domain';

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: EVENT_TYPES }).notNull().default('other'),
  date: text('date').notNull(),
  startTime: text('start_time'),
  endTime: text('end_time'),
  goalId: text('goal_id'),
  projectId: text('project_id'),
  opportunityId: text('opportunity_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
