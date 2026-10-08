import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Hop is single-user, so this table holds at most one row (id = 1) of user preferences. */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  updatedAt: text('updated_at').notNull(),
});
