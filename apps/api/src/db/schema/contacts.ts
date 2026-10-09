import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Playbook } from '@hop/domain';

import { CONTACT_KINDS, INTERACTION_TYPES } from '@hop/domain';

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role'),
  organization: text('organization'),
  kind: text('kind', { enum: CONTACT_KINDS }).notNull().default('other'),
  email: text('email'),
  linkedin: text('linkedin'),
  notes: text('notes'),
  interests: text('interests', { mode: 'json' }).$type<string[]>().notNull().default([]),
  playbook: text('playbook', { mode: 'json' }).$type<Playbook>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const interactions = sqliteTable('interactions', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').notNull(),
  opportunityId: text('opportunity_id'),
  type: text('type', { enum: INTERACTION_TYPES }).notNull(),
  date: text('date').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
});
