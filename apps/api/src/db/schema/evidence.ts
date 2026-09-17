import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  skillId: text('skill_id'),
  projectId: text('project_id'),
  opportunityId: text('opportunity_id'),
  goalId: text('goal_id'),
  url: text('url'),
  date: text('date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
