import { randomUUID } from 'node:crypto';

import { STARTER_CATEGORIES, WISH_WAIT_DAYS } from '@hop/domain';
import type {
  Account,
  Bill,
  CreateBillInput,
  CreateIncomeSourceInput,
  CreateMoneyEntryInput,
  CreatePotInput,
  CreatePotMoveInput,
  CreateSpendCategoryInput,
  CreateWalletInput,
  IncomeSource,
  MoneyEntry,
  MoneyRate,
  Pot,
  PotMove,
  SetMoneyRateInput,
  SpendCategory,
  UpdateBillInput,
  UpdateIncomeSourceInput,
  UpdateMoneyEntryInput,
  UpdatePotInput,
  UpdatePotMoveInput,
  UpdateSpendCategoryInput,
  UpdateWalletInput,
  Wallet,
} from '@hop/domain';

import { db } from '../db/client.js';
import { ConflictError, InvalidInputError } from '../errors.js';
import { accountRepository } from '../repositories/account.repository.js';
import {
  billRepository,
  incomeSourceRepository,
  moneyEntryRepository,
  moneyRateRepository,
  potMoveRepository,
  potRepository,
  spendCategoryRepository,
  walletRepository,
} from '../repositories/money.repository.js';
import { settingsService } from './settings.service.js';

const now = () => new Date().toISOString();
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);
const nextPosition = (list: { position: number }[]) => list.reduce((max, item) => Math.max(max, item.position + 1), 0);

/**
 * The day a monthly or yearly subscription renews in a month ("2026-10"): its day, or the month's
 * last day. Null for a subscription that isn't charged that month, or not yet: never before the
 * renewal day it was given.
 */
function renewalIn(account: Account, month: string): string | null {
  if (account.status !== 'active' || !account.cost || !account.renewsOn) return null;
  if (account.cycle !== 'monthly' && !(account.cycle === 'yearly' && account.renewsOn.slice(5, 7) === month.slice(5, 7))) return null;
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const day = `${month}-${String(Math.min(Number(account.renewsOn.slice(8, 10)), lastDay)).padStart(2, '0')}`;
  return day < account.renewsOn ? null : day;
}

function walletOrThrow(id: string): Wallet {
  const wallet = walletRepository.findById(id);
  if (!wallet) throw new InvalidInputError('That wallet doesn’t exist.');
  return wallet;
}

/** The links an entry makes must point at something real. */
function checkLinks(entry: Partial<MoneyEntry>) {
  if (entry.categoryId && !spendCategoryRepository.findById(entry.categoryId)) throw new InvalidInputError('That category doesn’t exist.');
  if (entry.billId && !billRepository.findById(entry.billId)) throw new InvalidInputError('That fixed cost doesn’t exist.');
  if (entry.accountId && !accountRepository.findById(entry.accountId)) throw new InvalidInputError('That account doesn’t exist.');
  if (entry.incomeId && !incomeSourceRepository.findById(entry.incomeId)) throw new InvalidInputError('That income doesn’t exist.');
  if (entry.potId && !potRepository.findById(entry.potId)) throw new InvalidInputError('That wish or saving doesn’t exist.');
}

/** A transfer between wallets of different currencies needs what arrived; in one currency it's the same amount. */
function transferAmount(from: Wallet, toWalletId: string | null | undefined, amount: number, toAmount: number | null | undefined) {
  if (!toWalletId) return null;
  const to = walletOrThrow(toWalletId);
  if (to.currency === from.currency) return null;
  if (!toAmount) throw new InvalidInputError(`Say how much arrived in ${to.name} (${to.currency}).`);
  return toAmount;
}

export const walletService = {
  getAll: (): Wallet[] => walletRepository.findAll(),

  create(input: CreateWalletInput): Wallet {
    const stamp = now();
    return walletRepository.create({
      id: randomUUID(),
      name: input.name,
      kind: input.kind ?? 'cash',
      currency: input.currency ?? 'TRY',
      openingBalance: input.openingBalance ?? 0,
      openedOn: input.openedOn ?? settingsService.today(),
      archived: false,
      position: input.position ?? nextPosition(walletRepository.findAll()),
      createdAt: stamp,
      updatedAt: stamp,
    });
  },

  update(id: string, input: UpdateWalletInput): Wallet | undefined {
    if (!walletRepository.findById(id)) return undefined;
    return walletRepository.update(id, { ...input, updatedAt: now() });
  },

  /** A wallet with history is archived instead, so past months keep adding up. Subscriptions charged to it go back to being logged by hand. */
  delete(id: string): boolean {
    if (moneyEntryRepository.usedBy('walletId', id) || moneyEntryRepository.usedBy('toWalletId', id)) throw new ConflictError('This wallet has entries. Archive it instead, so past months still add up.');
    return db.transaction(() => {
      for (const account of accountRepository.findAll()) if (account.walletId === id) accountRepository.update(account.id, { walletId: null });
      return walletRepository.delete(id);
    });
  },
};

export const moneyEntryService = {
  getAll: (): MoneyEntry[] => moneyEntryRepository.findAll(),

  /** An entry is in its wallet's currency. `auto` marks one Hop logged by itself. */
  create(input: CreateMoneyEntryInput, auto = false): MoneyEntry {
    const wallet = walletOrThrow(input.walletId);
    checkLinks(input);
    const stamp = now();
    return moneyEntryRepository.create({
      id: randomUUID(),
      date: input.date,
      kind: input.kind,
      amount: input.amount,
      currency: wallet.currency,
      walletId: wallet.id,
      categoryId: input.kind === 'expense' ? input.categoryId ?? null : null,
      billId: input.kind === 'expense' ? input.billId ?? null : null,
      accountId: input.kind === 'expense' ? input.accountId ?? null : null,
      potId: input.kind === 'expense' ? input.potId ?? null : null,
      incomeId: input.kind === 'income' ? input.incomeId ?? null : null,
      toWalletId: input.kind === 'transfer' ? input.toWalletId ?? null : null,
      toAmount: input.kind === 'transfer' ? transferAmount(wallet, input.toWalletId, input.amount, input.toAmount) : null,
      note: input.note ?? '',
      auto,
      createdAt: stamp,
      updatedAt: stamp,
    });
  },

  update(id: string, input: UpdateMoneyEntryInput): MoneyEntry | undefined {
    const existing = moneyEntryRepository.findById(id);
    if (!existing) return undefined;
    checkLinks(input);
    const merged = { ...existing, ...input };
    if (existing.kind !== 'adjust' && merged.amount <= 0) throw new InvalidInputError('The amount must be more than 0.');
    const wallet = walletOrThrow(merged.walletId);
    const changes: Partial<MoneyEntry> = { ...input, currency: wallet.currency, updatedAt: now() };
    if (existing.kind === 'transfer') {
      if (!merged.toWalletId || merged.toWalletId === merged.walletId) throw new InvalidInputError('A transfer goes to another wallet.');
      changes.toAmount = transferAmount(wallet, merged.toWalletId, merged.amount, merged.toAmount);
    }
    return moneyEntryRepository.update(id, changes);
  },

  delete: (id: string): boolean => moneyEntryRepository.delete(id),
};

export const moneyRateService = {
  getAll: (): MoneyRate[] => moneyRateRepository.findAll(),

  /** One rate per month and currency: setting it again replaces it. */
  create(input: SetMoneyRateInput): MoneyRate {
    const existing = moneyRateRepository.find(input.month, input.currency);
    if (existing) return moneyRateRepository.update(existing.id, { rate: input.rate, updatedAt: now() })!;
    const stamp = now();
    return moneyRateRepository.create({ id: randomUUID(), ...input, createdAt: stamp, updatedAt: stamp });
  },

  update(id: string, input: Pick<MoneyRate, 'rate'>): MoneyRate | undefined {
    if (!moneyRateRepository.findById(id)) return undefined;
    return moneyRateRepository.update(id, { rate: input.rate, updatedAt: now() });
  },

  delete: (id: string): boolean => moneyRateRepository.delete(id),
};

export const incomeSourceService = {
  getAll: (): IncomeSource[] => incomeSourceRepository.findAll(),

  create(input: CreateIncomeSourceInput): IncomeSource {
    if (input.walletId) walletOrThrow(input.walletId);
    const stamp = now();
    return incomeSourceRepository.create({
      id: randomUUID(), name: input.name, amount: input.amount, currency: input.currency ?? 'TRY', payDay: input.payDay ?? null,
      walletId: input.walletId ?? null, active: input.active ?? true, createdAt: stamp, updatedAt: stamp,
    });
  },

  update(id: string, input: UpdateIncomeSourceInput): IncomeSource | undefined {
    if (!incomeSourceRepository.findById(id)) return undefined;
    if (input.walletId) walletOrThrow(input.walletId);
    return incomeSourceRepository.update(id, { ...input, updatedAt: now() });
  },

  /** Income already received keeps it, so it's paused instead. */
  delete(id: string): boolean {
    if (moneyEntryRepository.usedBy('incomeId', id)) throw new ConflictError('This income has been received before. Pause it instead.');
    return incomeSourceRepository.delete(id);
  },
};

export const billService = {
  getAll: (): Bill[] => billRepository.findAll(),

  create(input: CreateBillInput): Bill {
    checkLinks({ categoryId: input.categoryId ?? null });
    if (input.walletId) walletOrThrow(input.walletId);
    const stamp = now();
    return billRepository.create({
      id: randomUUID(), name: input.name, amount: input.amount, currency: input.currency ?? 'TRY', dueDay: input.dueDay,
      categoryId: input.categoryId ?? null, walletId: input.walletId ?? null, active: input.active ?? true, notes: input.notes ?? '', createdAt: stamp, updatedAt: stamp,
    });
  },

  update(id: string, input: UpdateBillInput): Bill | undefined {
    if (!billRepository.findById(id)) return undefined;
    checkLinks({ categoryId: input.categoryId ?? null });
    if (input.walletId) walletOrThrow(input.walletId);
    return billRepository.update(id, { ...input, updatedAt: now() });
  },

  delete(id: string): boolean {
    if (moneyEntryRepository.usedBy('billId', id)) throw new ConflictError('This cost has been paid before. Pause it instead, so past months still add up.');
    return billRepository.delete(id);
  },
};

export const spendCategoryService = {
  getAll: (): SpendCategory[] => spendCategoryRepository.findAll(),

  create(input: CreateSpendCategoryInput): SpendCategory {
    const stamp = now();
    return spendCategoryRepository.create({
      id: randomUUID(), name: input.name, monthlyBudget: input.monthlyBudget ?? null,
      position: input.position ?? nextPosition(spendCategoryRepository.findAll()), archived: false, createdAt: stamp, updatedAt: stamp,
    });
  },

  update(id: string, input: UpdateSpendCategoryInput): SpendCategory | undefined {
    if (!spendCategoryRepository.findById(id)) return undefined;
    return spendCategoryRepository.update(id, { ...input, updatedAt: now() });
  },

  delete(id: string): boolean {
    if (moneyEntryRepository.usedBy('categoryId', id)) throw new ConflictError('Spending is logged under this category. Archive it instead.');
    return spendCategoryRepository.delete(id);
  },
};

export const potService = {
  getAll: (): Pot[] => potRepository.findAll(),

  /** A wish waits WISH_WAIT_DAYS before it can be bought, unless a date is given. */
  create(input: CreatePotInput): Pot {
    const stamp = now();
    return potRepository.create({
      id: randomUUID(), name: input.name, kind: input.kind, target: input.target ?? null, currency: input.currency ?? 'TRY',
      monthly: input.monthly ?? null, priority: input.priority ?? 'medium', why: input.why ?? '', url: input.url ?? null,
      waitUntil: input.kind === 'wish' ? input.waitUntil ?? addDays(settingsService.today(), WISH_WAIT_DAYS) : null,
      status: 'saving', closedOn: null, position: input.position ?? nextPosition(potRepository.findAll()), createdAt: stamp, updatedAt: stamp,
    });
  },

  update(id: string, input: UpdatePotInput): Pot | undefined {
    if (!potRepository.findById(id)) return undefined;
    const changes: Partial<Pot> = { ...input, updatedAt: now() };
    if (input.status === 'saving') changes.closedOn = null;
    else if (input.status && !input.closedOn) changes.closedOn = settingsService.today();
    return potRepository.update(id, changes);
  },

  /** A pot goes with the money moves that filled it; a bought wish keeps its expense. */
  delete(id: string): boolean {
    return db.transaction(() => {
      potMoveRepository.deleteForPot(id);
      return potRepository.delete(id);
    });
  },

  /** Buying a wish records what it cost and closes the pot, which releases what was set aside. */
  buy(id: string, input: { date: string; amount: number; walletId: string; categoryId?: string | null | undefined; note?: string | undefined }): { pot: Pot; entry: MoneyEntry } | undefined {
    const pot = potRepository.findById(id);
    if (!pot) return undefined;
    if (pot.status !== 'saving') throw new ConflictError('This one is already closed.');
    if (pot.kind === 'wish' && pot.waitUntil && input.date < pot.waitUntil) {
      throw new ConflictError(`You set it to wait until ${pot.waitUntil}. Change the wait if you really need it now.`);
    }
    return db.transaction(() => {
      const entry = moneyEntryService.create({ date: input.date, kind: 'expense', amount: input.amount, walletId: input.walletId, categoryId: input.categoryId ?? null, potId: pot.id, note: input.note ?? pot.name });
      const updated = potRepository.update(pot.id, { status: 'bought', closedOn: input.date, updatedAt: now() })!;
      return { pot: updated, entry };
    });
  },
};

export const potMoveService = {
  getAll: (): PotMove[] => potMoveRepository.findAll(),

  create(input: CreatePotMoveInput): PotMove {
    const pot = potRepository.findById(input.potId);
    if (!pot) throw new InvalidInputError('That wish or saving doesn’t exist.');
    if (pot.status !== 'saving') throw new ConflictError('This one is closed. Open it again to put money aside.');
    return potMoveRepository.create({ id: randomUUID(), potId: input.potId, date: input.date, amount: input.amount, note: input.note ?? '', createdAt: now() });
  },

  update(id: string, input: UpdatePotMoveInput): PotMove | undefined {
    if (!potMoveRepository.findById(id)) return undefined;
    return potMoveRepository.update(id, input);
  },

  delete: (id: string): boolean => potMoveRepository.delete(id),
};

export const moneyService = {
  /**
   * Subscriptions charged to a wallet log themselves: each renewal this month that has come, once.
   * A renewal already paid by hand counts as logged, and one that was deleted stays deleted.
   */
  logSubscriptions(today = settingsService.today()): MoneyEntry[] {
    const month = today.slice(0, 7);
    return db.transaction(() => {
      const logged: MoneyEntry[] = [];
      for (const account of accountRepository.findAll()) {
        const due = renewalIn(account, month);
        if (!due || due > today || (account.autoLoggedOn && due <= account.autoLoggedOn)) continue;
        const wallet = account.walletId ? walletRepository.findById(account.walletId) : undefined;
        if (!wallet || wallet.archived || wallet.currency !== account.currency || due < wallet.openedOn) continue;
        if (!moneyEntryRepository.paidForAccount(account.id, month)) {
          logged.push(moneyEntryService.create({ date: due, kind: 'expense', amount: account.cost!, walletId: wallet.id, accountId: account.id, note: account.name }, true));
        }
        accountRepository.update(account.id, { autoLoggedOn: due });
      }
      return logged;
    });
  },

  /** First visit: the starter categories and a Cash wallet in lira, unless they exist. */
  setup(): { categories: SpendCategory[]; wallets: Wallet[] } {
    db.transaction(() => {
      if (!spendCategoryRepository.findAll().length) STARTER_CATEGORIES.forEach((name, position) => spendCategoryService.create({ name, position }));
      if (!walletRepository.findAll().length) walletService.create({ name: 'Cash', kind: 'cash', currency: 'TRY' });
    });
    return { categories: spendCategoryRepository.findAll(), wallets: walletRepository.findAll() };
  },
};
