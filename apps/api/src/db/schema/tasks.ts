import {
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@hop/domain';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),

  title: text('title').notNull(),

  description: text('description'),

  status: text('status', {
    enum: TASK_STATUSES,
  })
    .notNull()
    .default('todo'),

  priority: text('priority', {
    enum: TASK_PRIORITIES,
  })
    .notNull()
    .default('medium'),

  areaId: text('area_id'),
  goalId: text('goal_id'),
  projectId: text('project_id'),
  opportunityId: text('opportunity_id'),

  scheduledDate: text('scheduled_date'),
  dueDate: text('due_date'),

  estimatedMinutes: integer('estimated_minutes'),

  completedAt: text('completed_at'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});