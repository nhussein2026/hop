import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const reflections = sqliteTable('reflections', {
  id: text('id').primaryKey(),
  date: text('date').notNull().unique(),
  accomplished: text('accomplished').notNull().default(''),
  learned: text('learned').notNull().default(''),
  badly: text('badly').notNull().default(''),
  tomorrow: text('tomorrow').notNull().default(''),
  energy: integer('energy'),
  focus: integer('focus'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
