import test from 'node:test'
import assert from 'node:assert/strict'
import { occurrences, slotMinutes, slotOn } from './schedule.ts'

// 2026-11-23 and 2026-11-30 are Mondays.
test('a slot recurs on its weekday, inside its dates', () => {
  const mawaheb = [
    { day: 1, start: '19:00', end: '20:45', until: '2026-11-29' },
    { day: 1, start: '21:30', end: '22:20', from: '2026-11-30' },
  ]
  assert.deepEqual(occurrences(mawaheb, '2026-11-23', '2026-12-07').map((o) => `${o.date} ${o.start}`), ['2026-11-23 19:00', '2026-11-30 21:30', '2026-12-07 21:30'])
  assert.equal(slotOn(mawaheb[0]!, '2026-11-29'), false)
})

test('two slots on one day come out in time order, and skipped dates are left out', () => {
  const slots = [{ day: 1, start: '21:30', end: '22:20' }, { day: 1, start: '19:00', end: '20:45' }, { day: 3, start: '13:30', end: '15:50' }]
  assert.deepEqual(occurrences(slots, '2026-11-23', '2026-11-29').map((o) => `${o.date} ${o.start}`), ['2026-11-23 19:00', '2026-11-23 21:30', '2026-11-25 13:30'])
  assert.deepEqual(occurrences(slots, '2026-11-23', '2026-11-29', ['2026-11-23']).map((o) => o.date), ['2026-11-25'])
  assert.deepEqual(occurrences([], '2026-11-23', '2026-11-29'), [])
})

test('a slot’s length in minutes, midnight included', () => {
  assert.equal(slotMinutes({ start: '13:30', end: '16:00' }), 150)
  assert.equal(slotMinutes({ start: '22:30', end: '24:00' }), 90)
})
