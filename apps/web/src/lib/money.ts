// Money: balances, conversion to lira at the month's rate, the month's numbers (income, fixed
// costs, set aside, budgets, spent, left, safe per day), wishes and savings, and what's due.
import { BASE_CURRENCY, BILL_NOTICE_DAYS } from '@hop/domain'
import * as D from './dates.ts'
import type { Account, Bill, Currency, HopData, MoneyEntry, MoneyRate, Pot, PotMove, Wallet } from './types.ts'

type MoneyData = Pick<HopData, 'wallets' | 'moneyEntries' | 'moneyRates' | 'incomeSources' | 'bills' | 'spendCategories' | 'pots' | 'potMoves' | 'accounts'>

export const SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' }

/** "₺24,900", "$100.50": grouped, with cents only when there are any. */
export function formatMoney(amount: number, currency: Currency = BASE_CURRENCY) {
  const sign = amount < 0 ? '−' : ''
  const value = Math.abs(amount)
  const digits = Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2
  return `${sign}${SYMBOL[currency]}${value.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export const monthOf = (ymd: string) => ymd.slice(0, 7)
export const daysInMonth = (month: string) => D.dayOfMonth(D.addDays(D.addMonths(`${month}-01`, 1), -1))

/** The month's rate, or the closest earlier month's. Null when there is none at all. */
export function rateFor(rates: MoneyRate[], month: string, currency: Currency): number | null {
  if (currency === BASE_CURRENCY) return 1
  const earlier = rates.filter((r) => r.currency === currency && r.month <= month).sort((a, b) => b.month.localeCompare(a.month))[0]
  return earlier?.rate ?? null
}

/** An amount in lira at its month's rate; null when that currency has no rate yet. */
export function toBase(amount: number, currency: Currency, month: string, rates: MoneyRate[]): number | null {
  const rate = rateFor(rates, month, currency)
  return rate === null ? null : amount * rate
}

/* ---- Wallets ------------------------------------------------------------------------- */
/** What a wallet holds: its opening balance and every entry since, in its own currency. */
export function walletBalance(wallet: Wallet, entries: MoneyEntry[], until?: string) {
  let balance = wallet.openingBalance
  for (const e of entries) {
    if (e.date < wallet.openedOn || (until && e.date > until)) continue
    if (e.walletId === wallet.id) {
      if (e.kind === 'income' || e.kind === 'adjust') balance += e.amount
      else balance -= e.amount
    }
    if (e.kind === 'transfer' && e.toWalletId === wallet.id) balance += e.toAmount ?? e.amount
  }
  return Math.round(balance * 100) / 100
}

/** Money put aside for a pot: what went in minus what was taken back. */
export const potSaved = (pot: Pot, moves: PotMove[]) => moves.filter((m) => m.potId === pot.id).reduce((sum, m) => sum + m.amount, 0)

/** Open pots' set-aside money, in lira: it's still in the wallets, but spoken for. */
export function setAsideTotal(s: Pick<MoneyData, 'pots' | 'potMoves' | 'moneyRates'>, month: string) {
  return s.pots.filter((p) => p.status === 'saving').reduce((sum, p) => sum + (toBase(potSaved(p, s.potMoves), p.currency, month, s.moneyRates) ?? 0), 0)
}

/* ---- Wishes and savings ------------------------------------------------------------- */
/** A wish may be bought once its wait is over. */
export const canBuy = (pot: Pot, today: string) => pot.kind !== 'wish' || !pot.waitUntil || today >= pot.waitUntil

/** Months still needed at the monthly amount, or null when there's no target or no monthly amount. */
export function monthsToGo(pot: Pot, moves: PotMove[]) {
  if (!pot.target || !pot.monthly) return null
  const left = pot.target - potSaved(pot, moves)
  return left <= 0 ? 0 : Math.ceil(left / pot.monthly)
}

/* ---- The month ----------------------------------------------------------------------- */
/** The day a fixed cost falls due in a month: its day, or the month's last day. */
export const dueDate = (bill: Pick<Bill, 'dueDay'>, month: string) => `${month}-${String(Math.min(bill.dueDay, daysInMonth(month))).padStart(2, '0')}`

/** What a subscription charges in a month: monthly ones every month, yearly ones in the month they renew. */
export function subscriptionCharge(a: Account, month: string): number {
  if (a.status !== 'active' || !a.cost) return 0
  if (a.cycle === 'monthly') return a.cost
  if (a.cycle === 'weekly') return Math.round(((a.cost * 52) / 12) * 100) / 100
  if (a.cycle === 'yearly' && a.renewsOn) return a.renewsOn.slice(5, 7) === month.slice(5, 7) ? a.cost : 0
  return 0
}

export type FixedCost = { key: string; name: string; amount: number; currency: Currency; due: string; paid: MoneyEntry | null; bill: Bill | null; account: Account | null; base: number | null }

/** Fixed costs of a month: active bills and charging subscriptions, each with its payment if made. */
export function fixedCosts(s: MoneyData, month: string): FixedCost[] {
  const inMonth = (e: MoneyEntry) => monthOf(e.date) === month && e.kind === 'expense'
  const bills = s.bills.filter((b) => b.active).map((b): FixedCost => ({
    key: `bill-${b.id}`, name: b.name, amount: b.amount, currency: b.currency, due: dueDate(b, month), bill: b, account: null,
    paid: s.moneyEntries.find((e) => inMonth(e) && e.billId === b.id) ?? null,
    base: toBase(b.amount, b.currency, month, s.moneyRates),
  }))
  const subscriptions = s.accounts.filter((a) => subscriptionCharge(a, month) > 0).map((a): FixedCost => {
    const amount = subscriptionCharge(a, month)
    const day = a.renewsOn ? Number(a.renewsOn.slice(8, 10)) : 1
    return {
      key: `account-${a.id}`, name: a.name, amount, currency: a.currency, due: dueDate({ dueDay: day }, month), bill: null, account: a,
      paid: s.moneyEntries.find((e) => inMonth(e) && e.accountId === a.id) ?? null,
      base: toBase(amount, a.currency, month, s.moneyRates),
    }
  })
  return [...bills, ...subscriptions].sort((a, b) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name))
}

/** Everyday spending: expenses that don't pay a fixed cost or buy a wish. */
export const isEveryday = (e: MoneyEntry) => e.kind === 'expense' && !e.billId && !e.accountId && !e.potId

export type MonthSummary = {
  month: string
  income: { received: number; expected: number }
  fixed: { paid: number; due: number; items: FixedCost[] }
  setAside: number
  /** Wishes bought this month, beyond what was set aside for them. */
  wishes: number
  budget: number
  unplanned: number
  spent: number
  byCategory: { id: string | null; name: string; budget: number | null; spent: number }[]
  left: number
  /** Today's share of what's left: left ÷ days left, today included. Null for a past month. */
  safeToday: number | null
  spentToday: number
  daysLeft: number
  /** Currencies used this month that have no rate yet; their amounts are left out of the totals. */
  missingRates: Currency[]
}

export function monthSummary(s: MoneyData, month: string, today: string): MonthSummary {
  const missing = new Set<Currency>()
  const base = (amount: number, currency: Currency) => {
    const value = toBase(amount, currency, month, s.moneyRates)
    if (value === null) missing.add(currency)
    return value ?? 0
  }
  const entries = s.moneyEntries.filter((e) => monthOf(e.date) === month)

  const received = entries.filter((e) => e.kind === 'income').reduce((sum, e) => sum + base(e.amount, e.currency), 0)
  const expected = s.incomeSources
    .filter((src) => src.active && !entries.some((e) => e.kind === 'income' && e.incomeId === src.id))
    .reduce((sum, src) => sum + base(src.amount, src.currency), 0)

  const items = fixedCosts(s, month)
  for (const item of items) if (item.base === null) missing.add(item.currency)
  const paid = items.filter((i) => i.paid).reduce((sum, i) => sum + base(i.paid!.amount, i.paid!.currency), 0)
  const due = items.filter((i) => !i.paid).reduce((sum, i) => sum + (i.base ?? 0), 0)

  const setAside = s.pots.filter((p) => p.status === 'saving' && p.monthly).reduce((sum, p) => sum + base(p.monthly!, p.currency), 0)
  const categories = s.spendCategories.filter((c) => !c.archived).sort((a, b) => a.position - b.position)
  const budget = categories.reduce((sum, c) => sum + (c.monthlyBudget ?? 0), 0)

  // A wish costs the month only what wasn't set aside for it before.
  const wishes = entries.filter((e) => e.kind === 'expense' && e.potId).reduce((sum, e) => {
    const pot = s.pots.find((p) => p.id === e.potId)
    const saved = pot ? toBase(potSaved(pot, s.potMoves), pot.currency, month, s.moneyRates) ?? 0 : 0
    return sum + Math.max(0, base(e.amount, e.currency) - saved)
  }, 0)

  const everyday = entries.filter(isEveryday)
  const spentIn = (id: string | null) => everyday.filter((e) => e.categoryId === id).reduce((sum, e) => sum + base(e.amount, e.currency), 0)
  const byCategory: MonthSummary['byCategory'] = categories.map((c) => ({ id: c.id, name: c.name, budget: c.monthlyBudget, spent: spentIn(c.id) }))
  const archived = s.spendCategories.filter((c) => c.archived)
  for (const c of archived) {
    const spent = spentIn(c.id)
    if (spent) byCategory.push({ id: c.id, name: c.name, budget: null, spent })
  }
  const uncategorised = spentIn(null)
  if (uncategorised) byCategory.push({ id: null, name: 'No category', budget: null, spent: uncategorised })
  const spent = byCategory.reduce((sum, c) => sum + c.spent, 0)

  const days = daysInMonth(month)
  const current = monthOf(today) === month
  const daysLeft = current ? days - D.dayOfMonth(today) + 1 : month > monthOf(today) ? days : 0
  const left = budget - spent
  const round = (n: number) => Math.round(n * 100) / 100

  return {
    month,
    income: { received: round(received), expected: round(expected) },
    fixed: { paid: round(paid), due: round(due), items },
    setAside: round(setAside),
    wishes: round(wishes),
    budget: round(budget),
    unplanned: round(received + expected - paid - due - setAside - wishes - budget),
    spent: round(spent),
    byCategory,
    left: round(left),
    safeToday: daysLeft ? Math.max(0, Math.floor(left / daysLeft)) : null,
    spentToday: round(everyday.filter((e) => e.date === today).reduce((sum, e) => sum + base(e.amount, e.currency), 0)),
    daysLeft,
    missingRates: [...missing].filter((c) => c !== BASE_CURRENCY),
  }
}

/**
 * Fixed costs of this month due within BILL_NOTICE_DAYS or already past due, and not paid.
 * Subscriptions are left out: Accounts already warns before they renew.
 */
export function billsDue(s: MoneyData, today: string) {
  return fixedCosts(s, monthOf(today)).filter((item) => item.bill && !item.paid && D.diffDays(item.due, today) <= BILL_NOTICE_DAYS)
}

/* ---- Typing amounts ------------------------------------------------------------------- */
/**
 * An amount as typed: "85", "59.99", "59,99", "1.500" or "1,500" (fifteen hundred: three digits
 * after a single separator group thousands), "1.234,50". Null when it isn't a number.
 */
export function parseAmount(text: string): number | null {
  let value = text.replace(/[\s₺$€]|TL|TRY|USD|EUR/gi, '')
  const negative = /^[-−]/.test(value)
  value = value.replace(/^[-−+]/, '')
  if (!/^[\d.,]+$/.test(value) || !/\d/.test(value)) return null
  const last = Math.max(value.lastIndexOf('.'), value.lastIndexOf(','))
  const separators = value.match(/[.,]/g) ?? []
  const groupsOnly = separators.length > 0 && new Set(separators).size === 1 && /^\d{1,3}([.,]\d{3})+$/.test(value)
  if (groupsOnly) value = value.replace(/[.,]/g, '')
  else if (last >= 0) value = `${value.slice(0, last).replace(/[.,]/g, '')}.${value.slice(last + 1)}`
  const amount = Number(value)
  return Number.isFinite(amount) ? (negative ? -amount : amount) : null
}

/* ---- The wallet last used ------------------------------------------------------------- */
const WALLET_KEY = 'hop.money.wallet'

/** Remembered on this device only, so logging defaults to the wallet used last. */
export function rememberWallet(id: string) {
  try { localStorage.setItem(WALLET_KEY, id) } catch { /* private mode: no default next time */ }
}

/** The wallet to suggest: the one used last if it's still open (and in the currency asked for), else the first open one. */
export function defaultWallet(wallets: Wallet[], currency?: Currency): Wallet | undefined {
  let last: string | null = null
  try { last = localStorage.getItem(WALLET_KEY) } catch { /* no storage */ }
  const open = wallets.filter((w) => !w.archived && (!currency || w.currency === currency)).sort((a, b) => a.position - b.position)
  return open.find((w) => w.id === last) ?? open[0]
}
