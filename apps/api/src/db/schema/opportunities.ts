import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

import {
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
} from '@hop/domain';

export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  organization: text('organization'),
  url: text('url'),
  type: text('type', { enum: OPPORTUNITY_TYPES }).notNull().default('other'),
  stage: text('stage', { enum: OPPORTUNITY_STAGES }).notNull().default('saved'),
  priority: text('priority', { enum: OPPORTUNITY_PRIORITIES }).notNull().default('medium'),
  location: text('location'),
  remote: integer('remote', { mode: 'boolean' }).notNull().default(false),
  source: text('source'),
  openDate: text('open_date'),
  deadline: text('deadline'),
  appliedDate: text('applied_date'),
  decisionDate: text('decision_date'),
  nextEventDate: text('next_event_date'),
  nextEventLabel: text('next_event_label'),
  compensation: text('compensation'),
  technologyTags: blob('technology_tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  resumeId: text('resume_id'),
  coverLetterId: text('cover_letter_id'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  closedAt: text('closed_at'),
});
