import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { EVIDENCE_KINDS } from '@hop/domain';

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  kind: text('kind', { enum: EVIDENCE_KINDS }),
  // BY is an SQL keyword, so the column has a longer name.
  by: text('by_whom'),
  result: text('result'),
  skillId: text('skill_id'),
  skillIds: text('skill_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  projectId: text('project_id'),
  opportunityId: text('opportunity_id'),
  goalId: text('goal_id'),
  courseId: text('course_id'),
  url: text('url'),
  date: text('date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
