import { integer, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

import { CURRENCIES, MONEY_ENTRY_KINDS, POT_KINDS, POT_PRIORITIES, POT_STATUSES, RATE_CURRENCIES, WALLET_KINDS } from '@hop/domain';

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind', { enum: WALLET_KINDS }).notNull().default('cash'),
  currency: text('currency', { enum: CURRENCIES }).notNull().default('TRY'),
  openingBalance: real('opening_balance').notNull().default(0),
  openedOn: text('opened_on').notNull(),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const moneyEntries = sqliteTable('money_entries', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  kind: text('kind', { enum: MONEY_ENTRY_KINDS }).notNull(),
  amount: real('amount').notNull(),
  currency: text('currency', { enum: CURRENCIES }).notNull(),
  walletId: text('wallet_id').notNull(),
  categoryId: text('category_id'),
  billId: text('bill_id'),
  accountId: text('account_id'),
  potId: text('pot_id'),
  incomeId: text('income_id'),
  toWalletId: text('to_wallet_id'),
  toAmount: real('to_amount'),
  note: text('note').notNull().default(''),
  auto: integer('auto', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const moneyRates = sqliteTable('money_rates', {
  id: text('id').primaryKey(),
  month: text('month').notNull(),
  currency: text('currency', { enum: RATE_CURRENCIES }).notNull(),
  rate: real('rate').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [unique('money_rates_month_currency_unique').on(table.month, table.currency)]);

export const incomeSources = sqliteTable('income_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency', { enum: CURRENCIES }).notNull().default('TRY'),
  payDay: integer('pay_day'),
  walletId: text('wallet_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency', { enum: CURRENCIES }).notNull().default('TRY'),
  dueDay: integer('due_day').notNull(),
  categoryId: text('category_id'),
  walletId: text('wallet_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const spendCategories = sqliteTable('spend_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlyBudget: real('monthly_budget'),
  position: integer('position').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const pots = sqliteTable('pots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind', { enum: POT_KINDS }).notNull(),
  target: real('target'),
  currency: text('currency', { enum: CURRENCIES }).notNull().default('TRY'),
  monthly: real('monthly'),
  priority: text('priority', { enum: POT_PRIORITIES }).notNull().default('medium'),
  why: text('why').notNull().default(''),
  url: text('url'),
  waitUntil: text('wait_until'),
  status: text('status', { enum: POT_STATUSES }).notNull().default('saving'),
  closedOn: text('closed_on'),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const potMoves = sqliteTable('pot_moves', {
  id: text('id').primaryKey(),
  potId: text('pot_id').notNull(),
  date: text('date').notNull(),
  amount: real('amount').notNull(),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
});
