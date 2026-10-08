import assert from 'node:assert/strict'
import test from 'node:test'
import { addDays, addMonths, diffDays, dueLabel, monthLong, relative, setTimezone, startOfMonth, startOfWeek, ymdOf } from './dates.ts'

test('ymdOf uses the configured timezone, not UTC', () => {
  setTimezone('America/Los_Angeles')
  assert.equal(ymdOf('2026-10-08T03:00:00.000Z'), '2026-10-07')
  setTimezone('Europe/Istanbul')
  assert.equal(ymdOf('2026-10-07T22:30:00.000Z'), '2026-10-08')
})

test('date arithmetic crosses months and daylight saving changes', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(addDays('2026-03-29', -1), '2026-03-28')
  assert.equal(diffDays('2026-11-01', '2026-10-25'), 7)
})

test('startOfWeek honours the chosen first day', () => {
  assert.equal(startOfWeek('2026-10-08', 1), '2026-10-05')
  assert.equal(startOfWeek('2026-10-08', 0), '2026-10-04')
  assert.equal(startOfWeek('2026-10-08', 6), '2026-10-03')
})

test('relative and due labels are concrete', () => {
  assert.equal(relative('2026-10-09', '2026-10-08'), 'Tomorrow')
  assert.equal(relative('2026-10-05', '2026-10-08'), '3 days ago')
  assert.equal(dueLabel('2026-10-06', '2026-10-08'), 'Overdue by 2 days')
})

test('month steps stay inside the target month', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29')
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15')
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28')
  assert.equal(startOfMonth('2026-10-08'), '2026-10-01')
  assert.equal(monthLong('2026-10-08'), 'October 2026')
})
