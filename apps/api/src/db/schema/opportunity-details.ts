import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { OPPORTUNITY_ACTIVITY_TYPES } from '@hop/domain';

export const opportunityPrep = sqliteTable('opportunity_prep', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id').notNull(),
  text: text('text').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const opportunityActivities = sqliteTable('opportunity_activities', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id').notNull(),
  type: text('type', { enum: OPPORTUNITY_ACTIVITY_TYPES }).notNull(),
  text: text('text').notNull(),
  at: text('at').notNull(),
  createdAt: text('created_at').notNull(),
});
