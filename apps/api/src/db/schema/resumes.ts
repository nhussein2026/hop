import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  focus: text('focus'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * The document behind a resume version. Kept in the database, so backups and restores carry it
 * with everything else. At most one file per version: uploading again replaces it.
 */
export const resumeFiles = sqliteTable('resume_files', {
  resumeId: text('resume_id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
  createdAt: text('created_at').notNull(),
});
