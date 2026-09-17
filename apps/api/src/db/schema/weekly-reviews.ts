import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const weeklyReviews = sqliteTable('weekly_reviews', {
  id: text('id').primaryKey(),
  weekStart: text('week_start').notNull(),
  wins: text('wins').notNull().default(''),
  progress: text('progress').notNull().default(''),
  career: text('career').notNull().default(''),
  learning: text('learning').notNull().default(''),
  projects: text('projects').notNull().default(''),
  problems: text('problems').notNull().default(''),
  nextWeek: text('next_week').notNull().default(''),
  energy: integer('energy'),
  focus: integer('focus'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
