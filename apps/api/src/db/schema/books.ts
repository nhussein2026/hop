import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

import { BOOK_FORMATS, BOOK_STATUSES, LANGUAGES } from '@hop/domain';

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author'),
  pages: integer('pages'),
  language: text('language', { enum: LANGUAGES }),
  format: text('format', { enum: BOOK_FORMATS }).notNull().default('paper'),
  status: text('status', { enum: BOOK_STATUSES }).notNull().default('want'),
  why: text('why').notNull().default(''),
  suggestedById: text('suggested_by_id'),
  suggestedBy: text('suggested_by'),
  topics: text('topics', { mode: 'json' }).$type<string[]>().notNull().default([]),
  skillIds: text('skill_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  goalId: text('goal_id'),
  habitId: text('habit_id'),
  startedOn: text('started_on'),
  finishedOn: text('finished_on'),
  rating: integer('rating'),
  takeaways: text('takeaways', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const bookLoans = sqliteTable('book_loans', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull(),
  library: text('library').notNull(),
  borrowedOn: text('borrowed_on').notNull(),
  dueOn: text('due_on').notNull(),
  renewedOn: text('renewed_on', { mode: 'json' }).$type<string[]>().notNull().default([]),
  maxRenewals: integer('max_renewals'),
  returnedOn: text('returned_on'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const readingLog = sqliteTable('reading_log', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull(),
  date: text('date').notNull(),
  page: integer('page').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  unique('reading_log_book_id_date_unique').on(table.bookId, table.date),
]);
