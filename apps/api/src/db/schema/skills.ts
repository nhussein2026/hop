import {
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

import { SKILL_FOCUSES, SKILL_LEVELS, SKILL_TYPES } from '@hop/domain';

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  type: text('type', { enum: SKILL_TYPES }).notNull().default('tool'),
  focus: text('focus', { enum: SKILL_FOCUSES }).notNull().default('keep'),
  listed: integer('listed', { mode: 'boolean' }).notNull().default(false),
  bar: text('bar'),
  // The rating from before levels came from evidence; skills added since have none.
  level: text('level', { enum: SKILL_LEVELS }),
  confidence: integer('confidence'),
  lastPracticedAt: text('last_practiced_at'),
  yearsExperience: real('years_experience'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
