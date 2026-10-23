import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

import { CEFR_LEVELS, CHECK_AREAS, CHECK_JUDGES, PRACTICE_AREAS, PRACTICE_SLOTS } from '@hop/domain';
import type { CheckMetrics, LanguageSkill } from '@hop/domain';

export const practiceActivities = sqliteTable('practice_activities', {
  id: text('id').primaryKey(),
  area: text('area', { enum: PRACTICE_AREAS }).notNull(),
  title: text('title').notNull(),
  detail: text('detail').notNull().default(''),
  minutes: integer('minutes').notNull(),
  slot: text('slot', { enum: PRACTICE_SLOTS }).notNull().default('any'),
  days: text('days', { mode: 'json' }).$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
  position: integer('position').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const practiceSessions = sqliteTable('practice_sessions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  area: text('area', { enum: PRACTICE_AREAS }).notNull(),
  minutes: integer('minutes').notNull(),
  activityId: text('activity_id'),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
}, (table) => [
  // A planned activity is done at most once a day. Sessions outside the plan have no activity, and SQLite allows many of those.
  unique('practice_sessions_activity_id_date_unique').on(table.activityId, table.date),
]);

export const practiceTests = sqliteTable('practice_tests', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  title: text('title').notNull().default(''),
  scores: text('scores', { mode: 'json' }).$type<Partial<Record<LanguageSkill, number>>>().notNull(),
  max: text('max', { mode: 'json' }).$type<Record<LanguageSkill, number>>().notNull(),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const languageChecks = sqliteTable('language_checks', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  area: text('area', { enum: CHECK_AREAS }).notNull(),
  task: text('task').notNull().default(''),
  metrics: text('metrics', { mode: 'json' }).$type<CheckMetrics>().notNull(),
  level: text('level', { enum: CEFR_LEVELS }),
  judgedBy: text('judged_by', { enum: CHECK_JUDGES }),
  link: text('link').notNull().default(''),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('language_checks_area_date_idx').on(table.area, table.date)]);
