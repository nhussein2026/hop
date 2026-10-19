import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { ACCOUNT_STATUSES, BILLING_CYCLES, CURRENCIES } from '@hop/domain';

/** Accounts and subscriptions. There is deliberately no column for a password or a card number. */
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url'),
  login: text('login'),
  purpose: text('purpose').notNull().default(''),
  status: text('status', { enum: ACCOUNT_STATUSES }).notNull().default('active'),
  cost: real('cost'),
  currency: text('currency', { enum: CURRENCIES }).notNull().default('TRY'),
  cycle: text('cycle', { enum: BILLING_CYCLES }).notNull().default('none'),
  renewsOn: text('renews_on'),
  payment: text('payment'),
  secretIn: text('secret_in'),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
