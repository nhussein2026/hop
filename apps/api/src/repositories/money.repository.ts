import { and, eq } from 'drizzle-orm';

import type { Bill, IncomeSource, MoneyEntry, MoneyRate, Pot, PotMove, SpendCategory, Wallet } from '@hop/domain';

import { db } from '../db/client.js';
import { bills, incomeSources, moneyEntries, moneyRates, potMoves, pots, spendCategories, wallets } from '../db/schema/index.js';

type MoneyTable = typeof wallets | typeof moneyEntries | typeof moneyRates | typeof incomeSources | typeof bills | typeof spendCategories | typeof pots | typeof potMoves;

/** The same five operations for every Money table. */
function rows<Row extends { id: string }>(table: MoneyTable) {
  return {
    findAll(): Row[] {
      return db.select().from(table).all() as unknown as Row[];
    },
    findById(id: string): Row | undefined {
      return db.select().from(table).where(eq(table.id, id)).get() as unknown as Row | undefined;
    },
    create(row: Row): Row {
      db.insert(table).values(row as never).run();
      return row;
    },
    update(id: string, changes: Partial<Row>): Row | undefined {
      db.update(table).set(changes as never).where(eq(table.id, id)).run();
      return this.findById(id);
    },
    delete(id: string): boolean {
      return db.delete(table).where(eq(table.id, id)).run().changes > 0;
    },
  };
}

export const walletRepository = rows<Wallet>(wallets);
export const moneyEntryRepository = {
  ...rows<MoneyEntry>(moneyEntries),
  /** Whether anything still points at a wallet, a category, a fixed cost, an income or a pot. */
  usedBy(field: 'walletId' | 'toWalletId' | 'categoryId' | 'billId' | 'incomeId' | 'potId', id: string): boolean {
    return Boolean(db.select({ id: moneyEntries.id }).from(moneyEntries).where(eq(moneyEntries[field], id)).get());
  },
};
export const moneyRateRepository = {
  ...rows<MoneyRate>(moneyRates),
  find(month: string, currency: MoneyRate['currency']): MoneyRate | undefined {
    return db.select().from(moneyRates).where(and(eq(moneyRates.month, month), eq(moneyRates.currency, currency))).get();
  },
};
export const incomeSourceRepository = rows<IncomeSource>(incomeSources);
export const billRepository = rows<Bill>(bills);
export const spendCategoryRepository = rows<SpendCategory>(spendCategories);
export const potRepository = rows<Pot>(pots);
export const potMoveRepository = {
  ...rows<PotMove>(potMoves),
  deleteForPot(potId: string): void {
    db.delete(potMoves).where(eq(potMoves.potId, potId)).run();
  },
};
