import assert from 'node:assert/strict'
import test from 'node:test'
import { areaSummaries, checkCounts, checkValues, formatValue } from './checks.ts'
import type { CheckArea, CheckMetrics, LanguageCheck } from './types.ts'

let n = 0
const check = (date: string, area: CheckArea, metrics: CheckMetrics): LanguageCheck => ({
  id: `c${++n}`, date, area, task: '', metrics, level: null, judgedBy: null, link: '', note: '', createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`,
})

test('a check’s figures are derived from its counts', () => {
  const speaking = checkValues(check('2026-10-24', 'speaking', { seconds: 120, words: 150, errors: 9 }))
  assert.deepEqual(speaking.map((v) => [v.key, v.value]), [['wpm', 75], ['errorsPerMin', 4.5]])
  assert.equal(formatValue(speaking[0]!), '75 wpm')

  const writing = checkValues(check('2026-10-24', 'writing', { minutes: 30, words: 180, errors: 14, rubric: 12 }))
  assert.deepEqual(writing.map((v) => [v.key, v.value, v.better]), [['errorsPer100', 7.8, 'lower'], ['rubric', 12, 'higher']])
  assert.equal(formatValue(writing[1]!), '12/25')

  assert.equal(checkValues(check('2026-10-24', 'listening', { mode: 'dictation', correct: 41, total: 52 }))[0]?.value, 79)
  assert.equal(formatValue(checkValues(check('2026-10-24', 'grammar', { correct: 17, total: 20 }))[0]!), '85%')
  assert.deepEqual(checkValues(check('2026-10-24', 'words', { mature: 320, known: 31, sampled: 50 })).map((v) => [v.key, v.value]), [['known', 62], ['mature', 320]])
})

test('a check’s counts read as a sentence', () => {
  assert.equal(checkCounts(check('2026-10-24', 'speaking', { seconds: 125, words: 150, errors: 1 })), '150 words in 2:05, 1 error')
  assert.equal(checkCounts(check('2026-10-24', 'listening', { mode: 'questions', correct: 14, total: 20 })), 'Questions: 14 of 20 right')
  assert.equal(checkCounts(check('2026-10-24', 'reading', { correct: 22, total: 30, minutes: 25 })), '22 of 30 right in 25 min')
})

test('each area shows its latest check and the trend of its headline figure', () => {
  const checks = [
    check('2026-11-07', 'speaking', { seconds: 120, words: 140, errors: 8 }),
    check('2026-10-24', 'speaking', { seconds: 120, words: 110, errors: 10 }),
    check('2026-10-25', 'words', { retention: 82 }),
    check('2026-11-01', 'words', { known: 30, sampled: 50 }),
    ...Array.from({ length: 9 }, (_, i) => check(`2026-12-${String(i + 1).padStart(2, '0')}`, 'grammar', { correct: 10 + i, total: 20 })),
  ]
  const byArea = Object.fromEntries(areaSummaries(checks).map((s) => [s.area, s]))

  assert.equal(byArea.speaking?.latest?.date, '2026-11-07')
  assert.deepEqual(byArea.speaking?.trend, [{ date: '2026-10-24', value: 55 }, { date: '2026-11-07', value: 70 }])
  // The latest words check has no retention, so the trend follows what it has: the sample.
  assert.equal(byArea.words?.headline?.key, 'known')
  assert.deepEqual(byArea.words?.trend, [{ date: '2026-11-01', value: 60 }])
  assert.equal(byArea.grammar?.trend.length, 8)
  assert.equal(byArea.grammar?.trend[0]?.date, '2026-12-02')
  assert.equal(byArea.reading?.latest, null)
  assert.deepEqual(byArea.reading?.trend, [])
})
