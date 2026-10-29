import assert from 'node:assert/strict'
import test from 'node:test'
import { looksLikeSecret, money, monthlyCost, monthlyTotals, nextRenewal, renewingSoon } from './accounts.ts'
import { setTimezone } from './dates.ts'
import type { Account } from './types.ts'

setTimezone('UTC')

const stamp = '2026-10-01T00:00:00.000Z'
const account = (fields: Partial<Account> = {}): Account => ({
  id: 'a', name: 'Service', url: null, login: null, purpose: '', status: 'active', cost: null, currency: 'TRY', cycle: 'none',
  renewsOn: null, payment: null, secretIn: null, notes: '', walletId: null, autoLoggedOn: null, createdAt: stamp, updatedAt: stamp, ...fields,
})

test('renewals roll forward by the cycle; trials end once', () => {
  assert.equal(nextRenewal(account({ cycle: 'monthly', renewsOn: '2026-08-03' }), '2026-10-19'), '2026-11-03')
  assert.equal(nextRenewal(account({ cycle: 'monthly', renewsOn: '2026-10-19' }), '2026-10-19'), '2026-10-19')
  assert.equal(nextRenewal(account({ cycle: 'yearly', renewsOn: '2025-03-01' }), '2026-10-19'), '2027-03-01')
  assert.equal(nextRenewal(account({ cycle: 'weekly', renewsOn: '2026-10-05' }), '2026-10-19'), '2026-10-19')
  assert.equal(nextRenewal(account({ status: 'trial', cycle: 'monthly', renewsOn: '2026-10-21' }), '2026-10-19'), '2026-10-21')
  assert.equal(nextRenewal(account({ status: 'trial', cycle: 'monthly', renewsOn: '2026-10-01' }), '2026-10-19'), null)
  assert.equal(nextRenewal(account({ status: 'cancelled', cycle: 'monthly', renewsOn: '2026-11-01' }), '2026-10-19'), null)
  assert.equal(nextRenewal(account({ cycle: 'none', renewsOn: '2026-09-01' }), '2026-10-19'), null)
})

test('monthly totals add up active subscriptions per currency', () => {
  const list = [
    account({ cycle: 'monthly', cost: 59.99 }),
    account({ cycle: 'yearly', cost: 1200 }),
    account({ cycle: 'monthly', cost: 20, currency: 'USD' }),
    account({ cycle: 'monthly', cost: 100, status: 'cancelled' }),
    account({ cycle: 'monthly', cost: 100, status: 'trial' }),
  ]

  assert.equal(monthlyCost(list[1]!), 100)
  assert.deepEqual(monthlyTotals(list).map(([currency, total]) => [currency, Math.round(total * 100) / 100]), [['TRY', 159.99], ['USD', 20]])
  assert.equal(money(159.99, 'TRY'), '₺159.99')
  assert.equal(money(20, 'USD'), '$20')
})

test('renewals and trial ends in the next three days come first', () => {
  const soon = renewingSoon([
    account({ id: 'later', cycle: 'monthly', renewsOn: '2026-10-30' }),
    account({ id: 'trial', status: 'trial', renewsOn: '2026-10-20' }),
    account({ id: 'monthly', cycle: 'monthly', renewsOn: '2026-09-22' }),
  ], '2026-10-19')

  assert.deepEqual(soon.map((item) => [item.account.id, item.date]), [['trial', '2026-10-20'], ['monthly', '2026-10-22']])
})

test('typing a password into Hop is noticed', () => {
  assert.equal(looksLikeSecret('password: hunter2'), true)
  assert.equal(looksLikeSecret('Şifre = 1234'), true)
  assert.equal(looksLikeSecret('Reset the password from the email link'), false)
})
