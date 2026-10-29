import { z } from 'zod';
import { CARD_NUMBER, CURRENCIES, MONEY_ENTRY_KINDS, POT_KINDS, POT_PRIORITIES, POT_STATUSES, RATE_CURRENCIES, WALLET_KINDS } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
/** Money keeps labels ("Ziraat card"), never card or account numbers. */
const label = (name: string, max: number) => text(name, max).refine((value) => !CARD_NUMBER.test(value), 'That looks like a card or account number. Hop doesn’t store those; write a label like “Ziraat card” instead.');
const money = (name: string) => z.number().finite().min(0, `${name} can’t be negative`).max(100_000_000, `${name} looks too high`);
const positive = (name: string) => z.number().finite().gt(0, `${name} must be more than 0`).max(100_000_000, `${name} looks too high`);
const dayOfMonth = z.number().int().min(1, 'Use a day from 1 to 31').max(31, 'Use a day from 1 to 31');
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a month like 2026-10');
const url = z.string().trim().max(2000, 'Links cannot exceed 2000 characters').regex(/^https?:\/\/\S+\.\S+/, 'Use a full link starting with https://');

/* ---- Wallets ------------------------------------------------------------------------- */
const walletFields = {
  name: label('Name', 80).min(1, 'Name the wallet'),
  kind: z.enum(WALLET_KINDS),
  currency: z.enum(CURRENCIES),
  openingBalance: z.number().finite().min(-100_000_000).max(100_000_000),
  openedOn: date,
  archived: z.boolean(),
  position: z.number().int().min(0),
};
export const createWalletSchema = z.object(walletFields).omit({ archived: true }).partial().required({ name: true }).strict();
/** A wallet's currency is fixed: its entries are in it. */
export const updateWalletSchema = z.object(walletFields).omit({ currency: true }).partial().strict();

/* ---- Entries ------------------------------------------------------------------------- */
const entryFields = {
  date,
  amount: z.number().finite().max(100_000_000, 'That amount looks too high').min(-100_000_000, 'That amount looks too low'),
  walletId: id,
  categoryId: id.nullable(),
  billId: id.nullable(),
  accountId: id.nullable(),
  potId: id.nullable(),
  incomeId: id.nullable(),
  toWalletId: id.nullable(),
  toAmount: positive('The amount received').nullable(),
  note: label('Note', 500),
};

/** Everything but an adjustment is a positive amount; a transfer needs where it went. */
function checkEntry(value: { kind?: string | undefined; amount?: number | undefined; toWalletId?: string | null | undefined; walletId?: string | undefined }, ctx: z.RefinementCtx) {
  if (value.kind !== 'adjust' && value.amount !== undefined && value.amount <= 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'The amount must be more than 0' });
  if (value.kind === 'adjust' && value.amount === 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'An adjustment of 0 changes nothing' });
  if (value.kind === 'transfer' && !value.toWalletId) ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Say which wallet it went to' });
  if (value.toWalletId && value.toWalletId === value.walletId) ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'A transfer goes to another wallet' });
}

export const createMoneyEntrySchema = z.object({ ...entryFields, kind: z.enum(MONEY_ENTRY_KINDS) }).partial().required({ date: true, kind: true, amount: true, walletId: true }).strict().superRefine(checkEntry);
export const updateMoneyEntrySchema = z.object(entryFields).partial().strict();

/* ---- Rates, income, fixed costs, categories ------------------------------------------- */
export const setMoneyRateSchema = z.object({ month, currency: z.enum(RATE_CURRENCIES), rate: positive('The rate') }).strict();
export const updateMoneyRateSchema = z.object({ rate: positive('The rate') }).strict();

const incomeFields = {
  name: label('Name', 120).min(1, 'Name the income'),
  amount: money('The amount'),
  currency: z.enum(CURRENCIES),
  payDay: dayOfMonth.nullable(),
  walletId: id.nullable(),
  active: z.boolean(),
};
export const createIncomeSourceSchema = z.object(incomeFields).partial().required({ name: true, amount: true }).strict();
export const updateIncomeSourceSchema = z.object(incomeFields).partial().strict();

const billFields = {
  name: label('Name', 120).min(1, 'Name the cost'),
  amount: money('The amount'),
  currency: z.enum(CURRENCIES),
  dueDay: dayOfMonth,
  categoryId: id.nullable(),
  walletId: id.nullable(),
  active: z.boolean(),
  notes: label('Notes', 1000),
};
export const createBillSchema = z.object(billFields).partial().required({ name: true, amount: true, dueDay: true }).strict();
export const updateBillSchema = z.object(billFields).partial().strict();

const categoryFields = {
  name: text('Name', 60).min(1, 'Name the category'),
  monthlyBudget: money('The budget').nullable(),
  position: z.number().int().min(0),
  archived: z.boolean(),
};
export const createSpendCategorySchema = z.object(categoryFields).omit({ archived: true }).partial().required({ name: true }).strict();
export const updateSpendCategorySchema = z.object(categoryFields).partial().strict();

/* ---- Wishes and savings ---------------------------------------------------------------- */
const potFields = {
  name: label('Name', 120).min(1, 'Name it'),
  target: money('The target').nullable(),
  currency: z.enum(CURRENCIES),
  monthly: money('The monthly amount').nullable(),
  priority: z.enum(POT_PRIORITIES),
  why: label('Why', 500),
  url: url.nullable(),
  waitUntil: date.nullable(),
  status: z.enum(POT_STATUSES),
  closedOn: date.nullable(),
  position: z.number().int().min(0),
};
export const createPotSchema = z.object({ ...potFields, kind: z.enum(POT_KINDS) }).omit({ status: true, closedOn: true }).partial().required({ name: true, kind: true }).strict();
export const updatePotSchema = z.object(potFields).partial().strict();

/** Buying a wish records the expense and closes the pot. */
export const buyPotSchema = z.object({ date, amount: positive('The price'), walletId: id, categoryId: id.nullable().optional(), note: label('Note', 500).optional() }).strict();

const potMoveFields = { potId: id, date, amount: z.number().finite().max(100_000_000).min(-100_000_000).refine((value) => value !== 0, 'Put aside or take back more than 0'), note: label('Note', 500) };
export const createPotMoveSchema = z.object(potMoveFields).partial().required({ potId: true, date: true, amount: true }).strict();
export const updatePotMoveSchema = z.object(potMoveFields).omit({ potId: true }).partial().strict();
