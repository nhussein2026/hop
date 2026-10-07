import test from 'node:test'
import assert from 'node:assert/strict'

import { addDays, timestampToLocalDate, toLocalDate, weekStartOf } from './date.js'

test('toLocalDate uses the local calendar day', () => {
  assert.equal(toLocalDate(new Date(2026, 9, 7, 0, 30)), '2026-10-07')
  assert.equal(toLocalDate(new Date(2026, 9, 7, 23, 59)), '2026-10-07')
})

test('timestampToLocalDate converts a stored UTC timestamp to the local day', () => {
  const lateEvening = new Date(2026, 9, 7, 23, 30)
  assert.equal(timestampToLocalDate(lateEvening.toISOString()), '2026-10-07')
})

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(addDays('2027-01-01', -1), '2026-12-31')
  assert.equal(addDays('2026-10-07', -7), '2026-09-30')
})

test('weekStartOf returns the Monday of the week', () => {
  assert.equal(weekStartOf('2026-10-07'), '2026-10-05')
  assert.equal(weekStartOf('2026-10-05'), '2026-10-05')
  assert.equal(weekStartOf('2026-10-11'), '2026-10-05')
})
