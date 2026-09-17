import {
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

import { SKILL_LEVELS } from '@hop/domain';

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  level: text('level', { enum: SKILL_LEVELS }).notNull().default('learning'),
  confidence: integer('confidence'),
  lastPracticedAt: text('last_practiced_at'),
  yearsExperience: real('years_experience'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
