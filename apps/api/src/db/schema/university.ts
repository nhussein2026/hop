import { blob, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { ASSESSMENT_TYPES, COURSE_STATUSES, IDEA_KINDS, IDEA_STAGES, KEY_DATE_KINDS, LETTER_GRADES, PIN_KINDS, RESOURCE_KINDS } from '@hop/domain';
import type { ClassSlot, FinalEligibility } from '@hop/domain';

export const terms = sqliteTable('terms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  start: text('start').notNull(),
  end: text('end').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  termId: text('term_id'),
  status: text('status', { enum: COURSE_STATUSES }).notNull().default('taking'),
  crn: text('crn'),
  instructorId: text('instructor_id'),
  credits: real('credits'),
  ects: real('ects'),
  ninovaUrl: text('ninova_url'),
  schedule: text('schedule', { mode: 'json' }).$type<ClassSlot[]>().notNull().default([]),
  vf: text('vf', { mode: 'json' }).$type<FinalEligibility>(),
  absences: integer('absences').notNull().default(0),
  target: integer('target'),
  grade: text('grade', { enum: LETTER_GRADES }),
  why: text('why'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const assessments = sqliteTable('assessments', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull(),
  title: text('title').notNull(),
  type: text('type', { enum: ASSESSMENT_TYPES }).notNull(),
  weight: integer('weight').notNull(),
  due: text('due'),
  time: text('time'),
  score: real('score'),
  submitted: integer('submitted', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const keyDates = sqliteTable('key_dates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  kind: text('kind', { enum: KEY_DATE_KINDS }).notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const pins = sqliteTable('pins', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: PIN_KINDS }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const uniLinks = sqliteTable('uni_links', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: RESOURCE_KINDS }).notNull(),
  title: text('title').notNull(),
  url: text('url'),
  courseId: text('course_id'),
  topics: text('topics', { mode: 'json' }).$type<string[]>().notNull().default([]),
  body: text('body').notNull().default(''),
  source: text('source'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * A library item's file. Kept in the database, like resume files, so backups and restores carry
 * it with everything else. At most one file per item: uploading again replaces it.
 */
export const resourceFiles = sqliteTable('resource_files', {
  resourceId: text('resource_id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
  createdAt: text('created_at').notNull(),
});

export const ideas = sqliteTable('ideas', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  kind: text('kind', { enum: IDEA_KINDS }).notNull(),
  stage: text('stage', { enum: IDEA_STAGES }).notNull().default('spark'),
  question: text('question').notNull().default(''),
  why: text('why').notNull().default(''),
  nextStep: text('next_step').notNull().default(''),
  resourceIds: text('resource_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  advisorIds: text('advisor_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  courseIds: text('course_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  findIds: text('find_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
