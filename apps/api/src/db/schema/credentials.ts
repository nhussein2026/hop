import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Hop is single-user, so this table holds at most one row (id = 1). */
export const credentials = sqliteTable('credentials', {
  id: integer('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
