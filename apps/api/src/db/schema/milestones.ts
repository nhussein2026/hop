import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  goalId: text('goal_id'),
  title: text('title').notNull(),
  date: text('date').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
