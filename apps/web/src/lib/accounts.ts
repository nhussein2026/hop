// Accounts and subscriptions: when each renews next, what they cost a month, and which need a
// decision soon. Derived from a known renewal day and the billing cycle; nothing here is stored.
import { CURRENCIES, RENEWAL_NOTICE_DAYS } from '@hop/domain'
import * as D from './dates.ts'
import type { Account, Currency } from './types.ts'

/** Months, or days for weekly ones, between renewals. */
const STEP: Record<Account['cycle'], { months?: number; days?: number } | null> = { monthly: { months: 1 }, yearly: { months: 12 }, weekly: { days: 7 }, none: null }

/**
 * The next renewal on or after today. A recurring subscription rolls its known renewal day forward
 * by the cycle; a trial ends on its day and doesn't roll. Null when nothing renews.
 */
export function nextRenewal(a: Pick<Account, 'status' | 'cycle' | 'renewsOn'>, today: string): string | null {
  if (a.status === 'cancelled' || !a.renewsOn) return null
  const step = STEP[a.cycle]
  if (a.status === 'trial' || !step) return a.renewsOn >= today ? a.renewsOn : null
  let date = a.renewsOn
  for (let n = 1; date < today; n++) date = step.months ? D.addMonths(a.renewsOn, step.months * n) : D.addDays(a.renewsOn, step.days! * n)
  return date
}

/** What a subscription costs a month, so different cycles can be added up. */
export function monthlyCost(a: Pick<Account, 'cost' | 'cycle' | 'status'>): number {
  if (a.status !== 'active' || !a.cost) return 0
  return a.cycle === 'monthly' ? a.cost : a.cycle === 'yearly' ? a.cost / 12 : a.cycle === 'weekly' ? (a.cost * 52) / 12 : 0
}

/** Monthly totals per currency for active subscriptions, leaving out currencies with nothing. */
export function monthlyTotals(accounts: Account[]): [Currency, number][] {
  return CURRENCIES
    .map((currency): [Currency, number] => [currency, accounts.filter((a) => a.currency === currency).reduce((sum, a) => sum + monthlyCost(a), 0)])
    .filter(([, total]) => total > 0)
}

const SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' }

/** "₺59.99", "$20" */
export const money = (amount: number, currency: Currency) => `${SYMBOL[currency]}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`

/** Renewals and trial ends within the notice window, soonest first. */
export function renewingSoon(accounts: Account[], today: string) {
  return accounts
    .map((a) => ({ account: a, date: nextRenewal(a, today) }))
    .filter((item): item is { account: Account; date: string } => item.date !== null && D.diffDays(item.date, today) <= RENEWAL_NOTICE_DAYS)
    .sort((x, y) => x.date.localeCompare(y.date))
}

/** Words that suggest someone is about to type a secret into Hop. Unicode-aware, so “Şifre:” counts. */
export const looksLikeSecret = (text: string) => /(?<![\p{L}\p{N}])(password|passwd|passcode|pass|pwd|şifre|parola|pin|cvv|cvc)(?![\p{L}\p{N}])\s*[:=]/iu.test(text)
