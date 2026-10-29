import test from 'node:test';
import assert from 'node:assert/strict';

import { createMoneyEntrySchema, createWalletSchema } from '@hop/validation';

import { ConflictError, InvalidInputError } from '../errors.js';
import { accountService } from './account.service.js';
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

test('a subscription charged to a wallet logs itself once on its renewal day, and a deleted charge stays deleted', () => {
  const card = walletService.create({ name: 'Card for subscriptions', kind: 'card', currency: 'TRY', openedOn: '2026-01-01' });
  const dollars = walletService.create({ name: 'Dollars for subscriptions', kind: 'app', currency: 'USD', openedOn: '2026-01-01' });
  const music = accountService.create({ name: 'Music', status: 'active', cost: 59.99, cycle: 'monthly', renewsOn: '2026-10-03', walletId: card.id });
  const charges = () => moneyEntryService.getAll().filter((e) => e.accountId === music.id)

  // Not before the renewal day, then once.
  assert.equal(moneyService.logSubscriptions('2026-10-02').filter((e) => e.accountId === music.id).length, 0);
  const [charge] = moneyService.logSubscriptions('2026-10-03').filter((e) => e.accountId === music.id);
  assert.deepEqual([charge?.date, charge?.amount, charge?.walletId, charge?.auto], ['2026-10-03', 59.99, card.id, true]);
  moneyService.logSubscriptions('2026-10-20');
  assert.equal(charges().length, 1);

  // Deleted because it didn't happen: it isn't logged again this month, but next month's is.
  moneyEntryService.delete(charge!.id);
  moneyService.logSubscriptions('2026-10-21');
  assert.equal(charges().length, 0);
  moneyService.logSubscriptions('2026-11-03');
  assert.deepEqual(charges().map((e) => e.date), ['2026-11-03']);

  // Paid by hand first: nothing more is logged.
  moneyEntryService.create({ date: '2026-12-01', kind: 'expense', amount: 59.99, walletId: card.id, accountId: music.id });
  moneyService.logSubscriptions('2026-12-05');
  assert.deepEqual(charges().map((e) => e.auto), [true, false]);

  // Cancelled ones, ones in another currency than their wallet, and yearly ones outside their month log nothing.
  accountService.update(music.id, { status: 'cancelled' });
  assert.equal(moneyService.logSubscriptions('2027-01-05').filter((e) => e.accountId === music.id).length, 0);
  assert.throws(() => accountService.create({ name: 'Cloud', cost: 5, currency: 'USD', cycle: 'monthly', renewsOn: '2026-10-01', walletId: card.id }), InvalidInputError);
  const domain = accountService.create({ name: 'Domain', cost: 12, currency: 'USD', cycle: 'yearly', renewsOn: '2026-03-20', walletId: dollars.id });
  assert.equal(moneyService.logSubscriptions('2027-02-25').filter((e) => e.accountId === domain.id).length, 0);
  assert.equal(moneyService.logSubscriptions('2027-03-20').filter((e) => e.accountId === domain.id).length, 1);

  // A wallet deleted before anything was logged in it lets go of its subscriptions.
  const spare = walletService.create({ name: 'Spare', currency: 'USD', openedOn: '2026-01-01' });
  const news = accountService.create({ name: 'News', cost: 3, currency: 'USD', cycle: 'monthly', renewsOn: '2027-04-10', walletId: spare.id });
  walletService.delete(spare.id);
  assert.equal(accountService.getAll().find((a) => a.id === news.id)?.walletId, null);
});
