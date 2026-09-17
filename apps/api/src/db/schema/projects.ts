import {
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

import { PROJECT_STATUSES } from '@hop/domain';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  problem: text('problem'),
  blurb: text('blurb'),
  status: text('status', { enum: PROJECT_STATUSES }).notNull().default('planned'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  stack: text('stack').notNull().default('[]'),
  repositoryUrl: text('repository_url'),
  demoUrl: text('demo_url'),
  learned: text('learned'),
  challenges: text('challenges'),
  architectureNotes: text('architecture_notes'),
  goalIds: text('goal_ids').notNull().default('[]'),
  skillIds: text('skill_ids').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
