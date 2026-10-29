import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { billsDue, canBuy, fixedCosts, formatMoney, monthSummary, monthsToGo, parseAmount, potSaved, rateFor, toBase, walletBalance } from './money.ts'
import type { Account, Bill, HopData, IncomeSource, MoneyEntry, Pot, SpendCategory, Wallet } from './types.ts'

setTimezone('UTC')
const stamp = '2026-10-01T00:00:00.000Z'

type Money = Pick<HopData, 'wallets' | 'moneyEntries' | 'moneyRates' | 'incomeSources' | 'bills' | 'spendCategories' | 'pots' | 'potMoves' | 'accounts'>
const empty = (): Money => ({ wallets: [], moneyEntries: [], moneyRates: [], incomeSources: [], bills: [], spendCategories: [], pots: [], potMoves: [], accounts: [] })
const wallet = (fields: Partial<Wallet>): Wallet => ({ id: 'w', name: 'Ziraat', kind: 'bank', currency: 'TRY', openingBalance: 0, openedOn: '2026-10-01', archived: false, position: 0, createdAt: stamp, updatedAt: stamp, ...fields })
let n = 0
const entry = (fields: Partial<MoneyEntry>): MoneyEntry => ({ id: `e${n++}`, date: '2026-10-05', kind: 'expense', amount: 0, currency: 'TRY', walletId: 'w', categoryId: null, billId: null, accountId: null, potId: null, incomeId: null, toWalletId: null, toAmount: null, note: '', auto: false, createdAt: stamp, updatedAt: stamp, ...fields })
const bill = (fields: Partial<Bill>): Bill => ({ id: 'b', name: 'Rent', amount: 12000, currency: 'TRY', dueDay: 1, categoryId: null, walletId: null, active: true, notes: '', createdAt: stamp, updatedAt: stamp, ...fields })
const category = (id: string, monthlyBudget: number | null): SpendCategory => ({ id, name: id, monthlyBudget, position: 0, archived: false, createdAt: stamp, updatedAt: stamp })
const pot = (fields: Partial<Pot>): Pot => ({ id: 'p', name: 'Emergency fund', kind: 'saving', target: null, currency: 'TRY', monthly: null, priority: 'medium', why: '', url: null, waitUntil: null, status: 'saving', closedOn: null, position: 0, createdAt: stamp, updatedAt: stamp, ...fields })
const income = (fields: Partial<IncomeSource>): IncomeSource => ({ id: 'i', name: 'Veribir and Garanti', amount: 24900, currency: 'TRY', payDay: 1, walletId: null, active: true, createdAt: stamp, updatedAt: stamp, ...fields })

test('the month: income, fixed costs, set aside and budgets leave what’s unplanned; safe today shares what’s left', () => {
  const s = empty()
  s.incomeSources = [income({})]
  s.bills = [bill({ id: 'rent', amount: 12000 }), bill({ id: 'phone', name: 'Phone and internet', amount: 3000, dueDay: 15 })]
  s.pots = [pot({ monthly: 1500 })]
  s.spendCategories = [category('groceries', 5000), category('transport', 3000)]
  s.moneyEntries = [entry({ amount: 1500, categoryId: 'groceries' }), entry({ amount: 500, categoryId: 'transport', date: '2026-10-10' })]

  const m = monthSummary(s, '2026-10', '2026-10-10')
  assert.deepEqual([m.income.expected, m.fixed.due, m.setAside, m.budget, m.unplanned], [24900, 15000, 1500, 8000, 400])
  assert.deepEqual([m.spent, m.left, m.daysLeft, m.safeToday, m.spentToday], [2000, 6000, 22, 272, 500])

  // Paying the rent moves it from due to paid; the plan doesn't change.
  s.moneyEntries.push(entry({ amount: 12000, billId: 'rent', date: '2026-10-01' }))
  const paid = monthSummary(s, '2026-10', '2026-10-10')
  assert.deepEqual([paid.fixed.paid, paid.fixed.due, paid.spent, paid.unplanned], [12000, 3000, 2000, 400])
})

test('a wish bought costs the month only what wasn’t set aside for it', () => {
  const s = empty()
  s.incomeSources = [income({})]
  s.pots = [pot({ id: 'kindle', kind: 'wish', name: 'Kindle', target: 4500, status: 'bought' })]
  s.potMoves = [{ id: 'm', potId: 'kindle', date: '2026-09-15', amount: 2000, note: '', createdAt: stamp }]
  s.moneyEntries = [entry({ amount: 4500, potId: 'kindle' })]
  const m = monthSummary(s, '2026-10', '2026-10-10')
  assert.deepEqual([m.wishes, m.spent, m.unplanned], [2500, 0, 24900 - 2500])
})

test('other currencies count in lira at the month’s rate, or wait for one', () => {
  const s = empty()
  s.moneyEntries = [entry({ kind: 'income', amount: 100, currency: 'USD' })]
  assert.deepEqual([monthSummary(s, '2026-10', '2026-10-10').income.received, monthSummary(s, '2026-10', '2026-10-10').missingRates], [0, ['USD']])

  s.moneyRates = [{ id: 'r', month: '2026-09', currency: 'USD', rate: 49.7, createdAt: stamp, updatedAt: stamp }]
  // October has no rate of its own, so September's is used.
  assert.equal(rateFor(s.moneyRates, '2026-10', 'USD'), 49.7)
  assert.equal(monthSummary(s, '2026-10', '2026-10-10').income.received, 4970)
  assert.equal(toBase(10, 'EUR', '2026-10', s.moneyRates), null)
  assert.equal(rateFor(s.moneyRates, '2026-08', 'USD'), null)
})

test('subscriptions from Accounts are fixed costs: monthly ones every month, yearly ones in their renewal month', () => {
  const account = (fields: Partial<Account>): Account => ({ id: 'a', name: 'Spotify', url: null, login: null, purpose: '', status: 'active', cost: 59.99, currency: 'TRY', cycle: 'monthly', renewsOn: '2026-10-03', payment: null, secretIn: null, notes: '', walletId: null, autoLoggedOn: null, createdAt: stamp, updatedAt: stamp, ...fields })
  const s = empty()
  s.accounts = [account({}), account({ id: 'y', name: 'Domain', cost: 400, cycle: 'yearly', renewsOn: '2026-03-20' }), account({ id: 't', name: 'Trial', status: 'trial' })]
  assert.deepEqual(fixedCosts(s, '2026-10').map((c) => `${c.name} ${c.amount} ${c.due}`), ['Spotify 59.99 2026-10-03'])
  assert.deepEqual(fixedCosts(s, '2027-03').map((c) => c.name), ['Spotify', 'Domain'])
})

test('a wallet holds its opening balance and every entry since; a transfer across currencies uses what arrived', () => {
  const ziraat = wallet({ openingBalance: 1000 })
  const wise = wallet({ id: 'usd', name: 'Wise', currency: 'USD', openingBalance: 200 })
  const entries = [
    entry({ kind: 'income', amount: 24900 }),
    entry({ amount: 85 }),
    entry({ kind: 'transfer', walletId: 'usd', currency: 'USD', amount: 100, toWalletId: 'w', toAmount: 4950 }),
    entry({ kind: 'adjust', amount: -15 }),
    entry({ amount: 999, date: '2026-09-30' }),
  ]
  assert.equal(walletBalance(ziraat, entries), 1000 + 24900 - 85 + 4950 - 15)
  assert.equal(walletBalance(wise, entries), 100)
})

test('wishes wait, savings count months to go, and unpaid costs due soon need attention', () => {
  const wish = pot({ kind: 'wish', target: 2400, monthly: 600, waitUntil: '2026-11-28' })
  const moves = [{ id: 'm', potId: 'p', date: '2026-10-29', amount: 600, note: '', createdAt: stamp }]
  assert.deepEqual([canBuy(wish, '2026-11-27'), canBuy(wish, '2026-11-28'), potSaved(wish, moves), monthsToGo(wish, moves)], [false, true, 600, 3])

  const s = empty()
  s.bills = [bill({ id: 'rent', dueDay: 31 }), bill({ id: 'gym', name: 'Gym', dueDay: 15, amount: 900 })]
  assert.deepEqual(billsDue(s, '2026-10-29').map((b) => b.name), ['Gym', 'Rent'])
  s.moneyEntries = [entry({ billId: 'rent', amount: 12000, date: '2026-10-29' })]
  assert.deepEqual(billsDue(s, '2026-10-29').map((b) => b.name), ['Gym'])
  // February has 28 days: a cost due on the 31st falls on the 28th.
  assert.equal(fixedCosts(s, '2027-02').find((c) => c.name === 'Rent')?.due, '2027-02-28')
})

test('money reads well: grouped, cents only when there are any', () => {
  assert.deepEqual([formatMoney(24900), formatMoney(100.5, 'USD'), formatMoney(-85), formatMoney(59.99)], ['₺24,900', '$100.50', '−₺85', '₺59.99'])
})

test('amounts are read the way people type them', () => {
  const read = ['85', '59.99', '59,99', '1.500', '1,500', '1.234,50', '1,234.50', '12.5', '₺ 300', '-15', 'abc', '', '1.2.3,4']
  assert.deepEqual(read.map(parseAmount), [85, 59.99, 59.99, 1500, 1500, 1234.5, 1234.5, 12.5, 300, -15, null, null, 123.4])
})
