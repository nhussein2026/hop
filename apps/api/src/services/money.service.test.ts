import test from 'node:test';
import assert from 'node:assert/strict';

import { createMoneyEntrySchema, createWalletSchema } from '@hop/validation';

import { ConflictError, InvalidInputError } from '../errors.js';
import { moneyEntryService, moneyRateService, moneyService, potMoveService, potService, spendCategoryService, walletService } from './money.service.js';
import { settingsService } from './settings.service.js';

test('setting up Money creates the starter categories and a Cash wallet once', () => {
  const first = moneyService.setup();
  assert.ok(first.categories.some((c) => c.name === 'Groceries'));
  assert.ok(first.wallets.some((w) => w.name === 'Cash' && w.currency === 'TRY'));
  const again = moneyService.setup();
  assert.deepEqual([again.categories.length, again.wallets.length], [first.categories.length, first.wallets.length]);
});

test('an entry is in its wallet’s currency; a transfer across currencies needs what arrived', () => {
  const ziraat = walletService.create({ name: 'Ziraat', kind: 'bank', currency: 'TRY', openingBalance: 1000 });
  const wise = walletService.create({ name: 'Wise', kind: 'app', currency: 'USD' });
  const groceries = spendCategoryService.create({ name: 'Groceries test', monthlyBudget: 4000 });

  const spent = moneyEntryService.create({ date: '2026-10-29', kind: 'expense', amount: 85, walletId: ziraat.id, categoryId: groceries.id });
  assert.deepEqual([spent.currency, spent.categoryId], ['TRY', groceries.id]);

  assert.throws(() => moneyEntryService.create({ date: '2026-10-29', kind: 'transfer', amount: 100, walletId: wise.id, toWalletId: ziraat.id }), InvalidInputError);
  const exchange = moneyEntryService.create({ date: '2026-10-29', kind: 'transfer', amount: 100, walletId: wise.id, toWalletId: ziraat.id, toAmount: 4950 });
  assert.deepEqual([exchange.currency, exchange.toAmount], ['USD', 4950]);

  // Fields that don't belong to the kind are dropped.
  const income = moneyEntryService.create({ date: '2026-10-29', kind: 'income', amount: 24900, walletId: ziraat.id, categoryId: groceries.id });
  assert.equal(income.categoryId, null);

  assert.equal(createMoneyEntrySchema.safeParse({ date: '2026-10-29', kind: 'expense', amount: -5, walletId: ziraat.id }).success, false);
  assert.equal(createMoneyEntrySchema.safeParse({ date: '2026-10-29', kind: 'adjust', amount: -40, walletId: ziraat.id }).success, true);
  assert.equal(createWalletSchema.safeParse({ name: '4111 1111 1111 1111' }).success, false);
});

test('a wallet or category with history can’t be deleted, only archived', () => {
  const wallet = walletService.create({ name: 'Papara' });
  const category = spendCategoryService.create({ name: 'Books' });
  moneyEntryService.create({ date: '2026-10-29', kind: 'expense', amount: 120, walletId: wallet.id, categoryId: category.id });

  assert.throws(() => walletService.delete(wallet.id), ConflictError);
  assert.throws(() => spendCategoryService.delete(category.id), ConflictError);
  assert.equal(walletService.update(wallet.id, { archived: true })?.archived, true);
  assert.equal(walletService.delete(walletService.create({ name: 'Unused' }).id), true);
});

test('one rate per month and currency: setting it again replaces it', () => {
  const first = moneyRateService.create({ month: '2026-10', currency: 'USD', rate: 49.7 });
  const again = moneyRateService.create({ month: '2026-10', currency: 'USD', rate: 50.1 });
  assert.equal(again.id, first.id);
  assert.equal(moneyRateService.getAll().filter((r) => r.month === '2026-10' && r.currency === 'USD').map((r) => r.rate).join(), '50.1');
});

test('a wish waits 30 days, then buying it records the expense and closes it', () => {
  const today = settingsService.today();
  const wallet = walletService.create({ name: 'Wish wallet' });
  const headphones = potService.create({ name: 'JBL Tune 730BT', kind: 'wish', target: 2400 });
  assert.ok(headphones.waitUntil! > today);

  potMoveService.create({ potId: headphones.id, date: today, amount: 600 });
  assert.throws(() => potService.buy(headphones.id, { date: today, amount: 2350, walletId: wallet.id }), ConflictError);

  const bought = potService.buy(headphones.id, { date: headphones.waitUntil!, amount: 2350, walletId: wallet.id })!;
  assert.deepEqual([bought.pot.status, bought.pot.closedOn, bought.entry.potId, bought.entry.amount], ['bought', headphones.waitUntil, headphones.id, 2350]);
  assert.throws(() => potMoveService.create({ potId: headphones.id, date: today, amount: 100 }), ConflictError);

  // A saving has no wait; deleting a pot takes its moves with it.
  const fund = potService.create({ name: 'Emergency fund', kind: 'saving', target: 45000, monthly: 1500 });
  assert.equal(fund.waitUntil, null);
  potMoveService.create({ potId: fund.id, date: today, amount: 1500 });
  potService.delete(fund.id);
  assert.equal(potMoveService.getAll().some((m) => m.potId === fund.id), false);
});
