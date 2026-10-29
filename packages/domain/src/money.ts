import type { Currency } from './account.js';
import type { EntityId, ISODate, ISODateTime } from './common.js';

/** Totals are in lira; USD and EUR convert at the month's rate the user typed in. */
export const BASE_CURRENCY: Currency = 'TRY';

/** A wish waits this many days before it can be bought, against impulse buys. */
export const WISH_WAIT_DAYS = 30;

/** Fixed costs due within this many days, and not paid, show in Needs attention. */
export const BILL_NOTICE_DAYS = 3;

/** Starter categories for everyday spending, created by "Set up Money". */
export const STARTER_CATEGORIES = ['Groceries', 'Eating out', 'Transport', 'Home', 'Health', 'Personal', 'Education', 'Family & gifts', 'Other'] as const;

export const WALLET_KINDS = ['cash', 'bank', 'card', 'app'] as const;
export type WalletKind = (typeof WALLET_KINDS)[number];

/** Where money is: cash, a bank account, a card, an app. Its balance comes from its entries. */
export interface Wallet {
  id: EntityId;
  name: string;
  kind: WalletKind;
  currency: Currency;
  openingBalance: number;
  /** The day the opening balance was true. Entries before it don't count. */
  openedOn: ISODate;
  archived: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const MONEY_ENTRY_KINDS = ['income', 'expense', 'transfer', 'adjust'] as const;
export type MoneyEntryKind = (typeof MONEY_ENTRY_KINDS)[number];

/**
 * One movement of money in a wallet, in the wallet's currency. Amounts are positive except for
 * `adjust`, which is signed: it makes a wallet match what it really holds.
 */
export interface MoneyEntry {
  id: EntityId;
  date: ISODate;
  kind: MoneyEntryKind;
  amount: number;
  currency: Currency;
  walletId: EntityId;
  /** Expenses: what it was for. */
  categoryId: EntityId | null;
  /** Expenses that pay a fixed cost, or a subscription from Accounts, for that month. */
  billId: EntityId | null;
  accountId: EntityId | null;
  /** Expenses that buy a wish. */
  potId: EntityId | null;
  /** Income from a regular source. */
  incomeId: EntityId | null;
  /** Transfers: the wallet it went to, and the amount it arrived as when the currencies differ. */
  toWalletId: EntityId | null;
  toAmount: number | null;
  note: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const RATE_CURRENCIES = ['USD', 'EUR'] as const;
export type RateCurrency = (typeof RATE_CURRENCIES)[number];

/** Lira for one dollar or euro in a month ("2026-10": 1 USD = 49.7 TL). */
export interface MoneyRate {
  id: EntityId;
  month: string;
  currency: RateCurrency;
  rate: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** A regular income (a salary): expected each month, received with an income entry. */
export interface IncomeSource {
  id: EntityId;
  name: string;
  amount: number;
  currency: Currency;
  /** Day of the month it usually arrives, if it has one. */
  payDay: number | null;
  walletId: EntityId | null;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** A fixed monthly cost (rent, phone, a transport card), paid each month with an expense entry. */
export interface Bill {
  id: EntityId;
  name: string;
  amount: number;
  currency: Currency;
  /** Day of the month it's due; past the month's last day means its last day. */
  dueDay: number;
  categoryId: EntityId | null;
  walletId: EntityId | null;
  active: boolean;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Everyday spending is logged under these, each with an optional monthly budget in lira. */
export interface SpendCategory {
  id: EntityId;
  name: string;
  monthlyBudget: number | null;
  position: number;
  archived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const POT_KINDS = ['wish', 'saving'] as const;
export type PotKind = (typeof POT_KINDS)[number];
export const POT_STATUSES = ['saving', 'done', 'bought', 'dropped'] as const;
export type PotStatus = (typeof POT_STATUSES)[number];
export const POT_PRIORITIES = ['high', 'medium', 'low'] as const;
export type PotPriority = (typeof POT_PRIORITIES)[number];

/**
 * Money put aside for something: a wish to buy (with a waiting time) or a saving such as the
 * emergency fund. Putting money aside earmarks it; the money stays in its wallet.
 */
export interface Pot {
  id: EntityId;
  name: string;
  kind: PotKind;
  /** The price of a wish, or a saving's goal. Optional for an open-ended saving. */
  target: number | null;
  currency: Currency;
  /** How much to put aside each month, if planned. */
  monthly: number | null;
  priority: PotPriority;
  why: string;
  url: string | null;
  /** Wishes: the first day it may be bought. */
  waitUntil: ISODate | null;
  status: PotStatus;
  closedOn: ISODate | null;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Money put aside for a pot (positive) or taken back (negative), in the pot's currency. */
export interface PotMove {
  id: EntityId;
  potId: EntityId;
  date: ISODate;
  amount: number;
  note: string;
  createdAt: ISODateTime;
}

export type CreateWalletInput = Pick<Wallet, 'name'> & Partial<Pick<Wallet, 'kind' | 'currency' | 'openingBalance' | 'openedOn' | 'position'>>;
export type UpdateWalletInput = Partial<Pick<Wallet, 'name' | 'kind' | 'openingBalance' | 'openedOn' | 'archived' | 'position'>>;
export type CreateMoneyEntryInput = Pick<MoneyEntry, 'date' | 'kind' | 'amount' | 'walletId'> &
  Partial<Pick<MoneyEntry, 'categoryId' | 'billId' | 'accountId' | 'potId' | 'incomeId' | 'toWalletId' | 'toAmount' | 'note'>>;
export type UpdateMoneyEntryInput = Partial<Omit<MoneyEntry, 'id' | 'kind' | 'currency' | 'createdAt' | 'updatedAt'>>;
export type SetMoneyRateInput = Pick<MoneyRate, 'month' | 'currency' | 'rate'>;
export type CreateIncomeSourceInput = Pick<IncomeSource, 'name' | 'amount'> & Partial<Omit<IncomeSource, 'id' | 'name' | 'amount' | 'createdAt' | 'updatedAt'>>;
export type UpdateIncomeSourceInput = Partial<Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>>;
export type CreateBillInput = Pick<Bill, 'name' | 'amount' | 'dueDay'> & Partial<Omit<Bill, 'id' | 'name' | 'amount' | 'dueDay' | 'createdAt' | 'updatedAt'>>;
export type UpdateBillInput = Partial<Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>>;
export type CreateSpendCategoryInput = Pick<SpendCategory, 'name'> & Partial<Pick<SpendCategory, 'monthlyBudget' | 'position'>>;
export type UpdateSpendCategoryInput = Partial<Pick<SpendCategory, 'name' | 'monthlyBudget' | 'position' | 'archived'>>;
export type CreatePotInput = Pick<Pot, 'name' | 'kind'> & Partial<Pick<Pot, 'target' | 'currency' | 'monthly' | 'priority' | 'why' | 'url' | 'waitUntil' | 'position'>>;
export type UpdatePotInput = Partial<Omit<Pot, 'id' | 'kind' | 'createdAt' | 'updatedAt'>>;
export type CreatePotMoveInput = Pick<PotMove, 'potId' | 'date' | 'amount'> & Partial<Pick<PotMove, 'note'>>;
export type UpdatePotMoveInput = Partial<Pick<PotMove, 'date' | 'amount' | 'note'>>;
