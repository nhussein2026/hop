import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { FIND_KINDS, FIND_STATUSES } from '@hop/domain';

export const finds = sqliteTable('finds', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: FIND_KINDS }).notNull(),
  title: text('title').notNull(),
  url: text('url'),
  source: text('source').notNull().default(''),
  why: text('why').notNull(),
  topics: text('topics', { mode: 'json' }).$type<string[]>().notNull().default([]),
  status: text('status', { enum: FIND_STATUSES }).notNull().default('inbox'),
  eventDate: text('event_date'),
  taskId: text('task_id'),
  resourceId: text('resource_id'),
  ideaId: text('idea_id'),
  opportunityId: text('opportunity_id'),
  eventId: text('event_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
