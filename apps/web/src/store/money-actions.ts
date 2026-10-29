// Every change to Money: wallets and their entries, rates, income, fixed costs, categories,
// wishes and savings. Like actions.ts: cheap changes happen at once with Undo; the screens
// confirm deletes first.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import { formatMoney, rememberWallet } from '../lib/money.ts'
import type { FixedCost } from '../lib/money.ts'
import type { Bill, HopData, IncomeSource, MoneyEntry, MoneyEntryKind, MoneyRate, Pot, PotMove, RateCurrency, SpendCategory, Wallet } from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

type Stamped = 'id' | 'createdAt' | 'updatedAt'
export type WalletFields = Omit<Wallet, Stamped | 'archived' | 'position'>
export type EntryFields = { date: string; kind: MoneyEntryKind; amount: number; walletId: string } & Partial<Pick<MoneyEntry, 'categoryId' | 'billId' | 'accountId' | 'potId' | 'incomeId' | 'toWalletId' | 'toAmount' | 'note'>>
export type IncomeFields = Omit<IncomeSource, Stamped>
export type BillFields = Omit<Bill, Stamped>
export type PotFields = Pick<Pot, 'name' | 'target' | 'currency' | 'monthly' | 'priority' | 'why' | 'url'> & Partial<Pick<Pot, 'kind' | 'waitUntil'>>
/** One line of the budgets dialog: a new category has no id; `remove` archives it if anything uses it. */
export type BudgetLine = { id: string | null; name: string; monthlyBudget: number | null; remove: boolean }

/** The create endpoints take optional fields, not nulls. */
const createBody = (fields: object) => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== ''))
const changed = <T extends object>(item: T, changes: Partial<T>) => Object.fromEntries(Object.keys(changes).map((key) => [key, item[key as keyof T]])) as Partial<T>

const applyEntry = (entry: MoneyEntry, data: HopData) => upsert(data, 'moneyEntries', entry)
const applyWallet = (wallet: Wallet, data: HopData) => upsert(data, 'wallets', wallet)
const applyPot = (pot: Pot, data: HopData) => upsert(data, 'pots', pot)

export function useMoneyActions() {
  const { commit } = useHop()

  return useMemo(() => {
    const entries = {
      /** Logged entries can be undone from the toast: undo deletes what was just saved. */
      add(fields: EntryFields, label: string) {
        // Only paying for something makes a wallet the default for the next purchase.
        if (fields.kind === 'expense') rememberWallet(fields.walletId)
        let saved: MoneyEntry | undefined
        return commit(label, async () => (saved = await api.post<MoneyEntry>('/api/money/entries', createBody(fields))), applyEntry, {
          undo: () => { if (saved) void entries.remove(saved, 'Undone') },
        })
      },
      update(e: MoneyEntry, changes: Partial<EntryFields>, label = 'Entry updated') {
        const before = changed(e as EntryFields, changes)
        return commit(label, () => api.patch<MoneyEntry>(`/api/money/entries/${e.id}`, changes), applyEntry, {
          undo: () => void commit('Undone', () => api.patch<MoneyEntry>(`/api/money/entries/${e.id}`, before), applyEntry),
        })
      },
      /** Deleting can be undone too: the entry is saved again with the same fields. */
      remove(e: MoneyEntry, label = 'Entry deleted') {
        const fields: EntryFields = { date: e.date, kind: e.kind, amount: e.amount, walletId: e.walletId, categoryId: e.categoryId, billId: e.billId, accountId: e.accountId, potId: e.potId, incomeId: e.incomeId, toWalletId: e.toWalletId, toAmount: e.toAmount, note: e.note }
        return commit(label, () => api.delete(`/api/money/entries/${e.id}`), (_, current) => without(current, 'moneyEntries', e.id), {
          undo: label === 'Undone' ? undefined : () => void commit('Put back', () => api.post<MoneyEntry>('/api/money/entries', createBody(fields)), applyEntry),
        })
      },
    }

    const wallets = {
      add(fields: Partial<WalletFields> & Pick<WalletFields, 'name'>) {
        return commit(`${fields.name} added`, () => api.post<Wallet>('/api/money/wallets', createBody(fields)), applyWallet)
      },
      update(w: Wallet, changes: Partial<Omit<Wallet, Stamped | 'currency'>>, label: string, undo = false) {
        const before = changed(w, changes)
        return commit(label, () => api.patch<Wallet>(`/api/money/wallets/${w.id}`, changes), applyWallet, {
          undo: undo ? () => void commit('Undone', () => api.patch<Wallet>(`/api/money/wallets/${w.id}`, before), applyWallet) : undefined,
        })
      },
      remove(w: Wallet) {
        return commit(`${w.name} deleted`, () => api.delete(`/api/money/wallets/${w.id}`), (_, current) => without(current, 'wallets', w.id))
      },
      /** Makes Hop's balance match what the wallet really holds, with one adjustment entry. */
      match(w: Wallet, difference: number, date = D.today()) {
        return entries.add({ date, kind: 'adjust', amount: difference, walletId: w.id, note: 'Matched to the real balance' }, `${w.name} now matches: ${difference > 0 ? 'added' : 'took off'} ${formatMoney(Math.abs(difference), w.currency)}`)
      },
    }

    const rates = {
      /** Setting a month's rate again replaces it. */
      set(month: string, currency: RateCurrency, rate: number) {
        return commit(`1 ${currency} = ${rate} TL for ${D.monthLong(`${month}-01`)}`, () => api.post<MoneyRate>('/api/money/rates', { month, currency, rate }), (saved, current) => upsert(current, 'moneyRates', saved), { quiet: true })
      },
      remove(r: MoneyRate) {
        return commit('Rate removed', () => api.delete(`/api/money/rates/${r.id}`), (_, current) => without(current, 'moneyRates', r.id), { quiet: true })
      },
    }

    const income = {
      add(fields: Partial<IncomeFields> & Pick<IncomeFields, 'name' | 'amount'>) {
        return commit(`${fields.name} added`, () => api.post<IncomeSource>('/api/money/income', createBody(fields)), (saved, current) => upsert(current, 'incomeSources', saved))
      },
      update(src: IncomeSource, changes: Partial<IncomeFields>, label: string) {
        return commit(label, () => api.patch<IncomeSource>(`/api/money/income/${src.id}`, changes), (saved, current) => upsert(current, 'incomeSources', saved))
      },
      remove(src: IncomeSource) {
        return commit(`${src.name} deleted`, () => api.delete(`/api/money/income/${src.id}`), (_, current) => without(current, 'incomeSources', src.id))
      },
      /** Income arrives as an entry in a wallet, in that wallet's currency. */
      receive(src: IncomeSource | null, fields: { amount: number; walletId: string; date: string; note?: string }, wallet: Wallet) {
        return entries.add({ ...fields, kind: 'income', incomeId: src?.id ?? null }, `${formatMoney(fields.amount, wallet.currency)} received${src ? ` from ${src.name}` : ''}`)
      },
    }

    const bills = {
      add(fields: Partial<BillFields> & Pick<BillFields, 'name' | 'amount' | 'dueDay'>) {
        return commit(`${fields.name} added`, () => api.post<Bill>('/api/money/bills', createBody(fields)), (saved, current) => upsert(current, 'bills', saved))
      },
      update(b: Bill, changes: Partial<BillFields>, label: string) {
        return commit(label, () => api.patch<Bill>(`/api/money/bills/${b.id}`, changes), (saved, current) => upsert(current, 'bills', saved))
      },
      remove(b: Bill) {
        return commit(`${b.name} deleted`, () => api.delete(`/api/money/bills/${b.id}`), (_, current) => without(current, 'bills', b.id))
      },
      /** Paying a fixed cost or a subscription for the month it's due in. */
      pay(cost: FixedCost, fields: { amount: number; walletId: string; date: string }, wallet: Wallet) {
        return entries.add({
          ...fields, kind: 'expense', billId: cost.bill?.id ?? null, accountId: cost.account?.id ?? null, categoryId: cost.bill?.categoryId ?? null, note: cost.name,
        }, `${cost.name} paid: ${formatMoney(fields.amount, wallet.currency)}`)
      },
    }

    const categories = {
      /** The budgets dialog saves every line at once: renames, budgets, new categories and removals. */
      save(lines: BudgetLine[], data: HopData) {
        const used = (id: string) => data.moneyEntries.some((e) => e.categoryId === id) || data.bills.some((b) => b.categoryId === id)
        return commit('Budgets saved', async () => {
          const saved: SpendCategory[] = []
          const deleted: string[] = []
          let position = data.spendCategories.reduce((max, c) => Math.max(max, c.position + 1), 0)
          for (const line of lines) {
            const existing = line.id ? data.spendCategories.find((c) => c.id === line.id) : undefined
            if (!existing) {
              if (!line.remove && line.name) saved.push(await api.post<SpendCategory>('/api/money/categories', createBody({ name: line.name, monthlyBudget: line.monthlyBudget, position: position++ })))
            } else if (line.remove && !used(existing.id)) {
              await api.delete(`/api/money/categories/${existing.id}`)
              deleted.push(existing.id)
            } else if (line.remove || existing.name !== line.name || existing.monthlyBudget !== line.monthlyBudget) {
              saved.push(await api.patch<SpendCategory>(`/api/money/categories/${existing.id}`, line.remove ? { archived: true } : { name: line.name, monthlyBudget: line.monthlyBudget }))
            }
          }
          return { saved, deleted }
        }, ({ saved, deleted }, current) => {
          let next = current
          for (const c of saved) next = upsert(next, 'spendCategories', c)
          for (const id of deleted) next = without(next, 'spendCategories', id)
          return next
        })
      },
    }

    const pots = {
      add(fields: PotFields & { kind: Pot['kind'] }) {
        return commit(fields.kind === 'wish' ? `${fields.name} is on your wish list` : `${fields.name} added`, () => api.post<Pot>('/api/money/pots', createBody(fields)), applyPot)
      },
      update(p: Pot, changes: Partial<Omit<Pot, Stamped | 'kind'>>, label: string, undo = false) {
        const before = changed(p, changes)
        return commit(label, () => api.patch<Pot>(`/api/money/pots/${p.id}`, changes), applyPot, {
          undo: undo ? () => void commit('Undone', () => api.patch<Pot>(`/api/money/pots/${p.id}`, { ...before, status: p.status }), applyPot) : undefined,
        })
      },
      remove(p: Pot) {
        return commit(`${p.name} deleted`, () => api.delete(`/api/money/pots/${p.id}`), (_, current) => ({ ...without(current, 'pots', p.id), potMoves: current.potMoves.filter((m) => m.potId !== p.id) }))
      },
      /** Putting aside (positive) or taking back (negative) earmarks money; it stays in its wallet. */
      move(p: Pot, amount: number, date = D.today(), note = '') {
        let saved: PotMove | undefined
        const label = amount > 0 ? `${formatMoney(amount, p.currency)} put aside for ${p.name}` : `${formatMoney(-amount, p.currency)} taken back from ${p.name}`
        return commit(label, async () => (saved = await api.post<PotMove>('/api/money/pot-moves', createBody({ potId: p.id, date, amount, note }))), (move, current) => upsert(current, 'potMoves', move), {
          undo: () => { if (saved) void commit('Undone', () => api.delete(`/api/money/pot-moves/${saved!.id}`), (_, current) => without(current, 'potMoves', saved!.id)) },
        })
      },
      removeMove(m: PotMove) {
        return commit('Removed', () => api.delete(`/api/money/pot-moves/${m.id}`), (_, current) => without(current, 'potMoves', m.id))
      },
      /** Buying a wish records what it cost and closes it. */
      buy(p: Pot, fields: { amount: number; walletId: string; date: string }) {
        rememberWallet(fields.walletId)
        return commit(`${p.name} bought. Enjoy it.`, () => api.post<{ pot: Pot; entry: MoneyEntry }>(`/api/money/pots/${p.id}/buy`, fields), ({ pot, entry }, current) => applyEntry(entry, applyPot(pot, current)))
      },
    }

    return {
      /** First visit: the starter categories and a Cash wallet. */
      setup() {
        return commit('Finances is set up', () => api.post<{ categories: SpendCategory[]; wallets: Wallet[] }>('/api/money/setup'), ({ categories, wallets }, current) => ({ ...current, spendCategories: categories, wallets }), { quiet: true })
      },
      entries, wallets, rates, income, bills, categories, pots,
    }
  }, [commit])
}
