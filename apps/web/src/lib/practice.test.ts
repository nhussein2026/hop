import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { adjustTotals, checkpointCriterion, checkpointLevel, checkpoints, dayProgress, minimumOn, minimumWeek, minutesByWeekday, planFor, recentWeeks, testDue, testResult, weekBalance, weeklyPlan } from './practice.ts'
import type { LanguageTrack, Milestone, PracticeActivity, PracticeArea, PracticeSession, PracticeTest } from './types.ts'

setTimezone('UTC')

const stamp = '2026-10-01T00:00:00.000Z'
const ITU = { listening: 20, reading: 30, writing: 25, speaking: 25 }

const activity = (id: string, area: PracticeArea, minutes: number, fields: Partial<PracticeActivity> = {}): PracticeActivity => ({
  id, area, tier: 'standard', title: id, detail: '', minutes, slot: 'any', days: [0, 1, 2, 3, 4, 5, 6], position: 0, active: true, createdAt: stamp, updatedAt: stamp, ...fields,
})

const session = (date: string, area: PracticeArea, minutes: number, activityId: string | null = null): PracticeSession => ({ id: `${date}-${area}-${minutes}-${activityId}`, date, area, minutes, activityId, note: '', createdAt: stamp })

const plan = [
  activity('home-speak', 'speaking', 20, { slot: 'home', days: [1, 3, 5] }),
  activity('bus-listen', 'listening', 30, { slot: 'commute', position: 2 }),
  activity('bus-words', 'words', 20, { slot: 'commute', position: 1 }),
  activity('paused', 'reading', 30, { active: false }),
]

test('a day’s plan follows the weekday and the order of the day', () => {
  // 2026-10-19 is a Monday, 2026-10-20 a Tuesday.
  assert.deepEqual(planFor(plan, '2026-10-19').map((a) => a.id), ['bus-words', 'bus-listen', 'home-speak'])
  assert.deepEqual(planFor(plan, '2026-10-20').map((a) => a.id), ['bus-words', 'bus-listen'])
  assert.deepEqual(minutesByWeekday(plan), [50, 70, 50, 70, 50, 70, 50])
  assert.deepEqual(weeklyPlan(plan).minutes, { listening: 210, reading: 0, writing: 0, speaking: 60, words: 140 })
})

test('day progress counts practice outside the plan too', () => {
  const progress = dayProgress(plan, [session('2026-10-19', 'listening', 30, 'bus-listen'), session('2026-10-19', 'reading', 15)], '2026-10-19')

  assert.deepEqual([progress.planned, progress.done, progress.pct], [70, 45, 64])
  assert.deepEqual(progress.areas.reading, { planned: 0, done: 15 })
})

test('the week’s balance flags the exam skill furthest behind, not words', () => {
  const sessions = [
    session('2026-10-19', 'listening', 30), session('2026-10-20', 'listening', 30), session('2026-10-21', 'listening', 30),
    session('2026-10-19', 'speaking', 5),
  ]
  // On Wednesday, Monday and Tuesday are over: speaking planned 20 so far, 5 done; words 0 of 40 is not flagged.
  const week = weekBalance(plan, sessions, '2026-10-19', '2026-10-21')
  const speaking = week.rows.find((row) => row.area === 'speaking')!

  assert.deepEqual([speaking.planned, speaking.plannedSoFar, speaking.done], [60, 20, 5])
  assert.equal(week.behind?.area, 'speaking')
  // Practice today catches up straight away.
  assert.equal(weekBalance(plan, [...sessions, session('2026-10-21', 'speaking', 30)], '2026-10-19', '2026-10-21').behind, null)
  // On the first day of the week nothing is judged yet.
  assert.equal(weekBalance(plan, [], '2026-10-19', '2026-10-19').behind, null)
})

test('recent weeks add up per area, newest first', () => {
  const weeks = recentWeeks([session('2026-10-19', 'reading', 20), session('2026-10-14', 'reading', 10), session('2026-10-13', 'writing', 25)], '2026-10-19', 2)

  assert.deepEqual(weeks.map((w) => [w.start, w.total, w.days]), [['2026-10-19', 20, 1], ['2026-10-12', 35, 2]])
})

test('totals move with each change and count days that still have practice', () => {
  const totals = { minutes: { listening: 100, reading: 0, writing: 0, speaking: 0, words: 0 }, days: 4 }
  const before = [session('2026-10-19', 'listening', 30)]

  assert.deepEqual(adjustTotals(totals, [], [session('2026-10-20', 'reading', 20)]), { minutes: { ...totals.minutes, reading: 20 }, days: 5 })
  assert.deepEqual(adjustTotals(totals, before, [session('2026-10-19', 'listening', 45)]), { minutes: { ...totals.minutes, listening: 115 }, days: 4 })
  assert.deepEqual(adjustTotals(totals, before, []), { minutes: { ...totals.minutes, listening: 70 }, days: 3 })
})

const paper = (scores: PracticeTest['scores'], date = '2026-11-01'): PracticeTest => ({ id: date, date, title: '', scores, max: ITU, note: '', createdAt: stamp, updatedAt: stamp })

test('a practice test passes on its total, and names the weakest section', () => {
  assert.deepEqual(testResult(paper({ listening: 16, reading: 24, writing: 16, speaking: 15 }), 70), { score: 71, max: 100, complete: true, total: 71, weakest: 'speaking', passed: true })
  assert.deepEqual(testResult(paper({ reading: 18, listening: 15 }), 70), { score: 33, max: 50, complete: false, total: null, weakest: 'reading', passed: null })
})

test('practice tests come closer together toward the exam', () => {
  assert.equal(testDue([], 'A2', '2026-10-19').due, false)
  assert.equal(testDue([], 'B1', '2027-02-01').due, true)
  assert.equal(testDue([paper({ reading: 20 }, '2027-02-01')], 'B1', '2027-02-20').due, false)
  assert.equal(testDue([paper({ reading: 20 }, '2027-02-01')], 'B2', '2027-02-20').due, true)
})

test('checkpoints come from the track goal’s milestones', () => {
  const track = { goalId: 'g' } as LanguageTrack
  const milestone = (title: string, date: string, done = false, goalId = 'g'): Milestone => ({ id: title, goalId, title, date, done, createdAt: stamp, updatedAt: stamp })
  const road = checkpoints(track, [milestone('Finish B1', '2027-02-16'), milestone('Finish A2', '2026-12-15', true), milestone('Other', '2026-11-01', false, 'x')])

  assert.deepEqual(road.list.map((m) => m.title), ['Finish A2', 'Finish B1'])
  assert.equal(road.next?.title, 'Finish B1')
  assert.equal(checkpointLevel({ title: 'C1: İTÜ TÖMER certificate exam' }), 'C1')
})

test('a renamed checkpoint still finds its goal criterion by level', () => {
  const criterion = (id: string, text: string, done = false) => ({ id, goalId: 'g', text, note: null, done, position: 0, createdAt: stamp, updatedAt: stamp })
  const goal = { criteria: [criterion('a2', 'Finish A2', true), criterion('b1', 'Finish B1'), criterion('score', 'Score 70 or more on a full practice test')] }
  assert.equal(checkpointCriterion(goal, { title: 'Finish B1' })?.id, 'b1')
  assert.equal(checkpointCriterion(goal, { title: 'B1 gate: speaking and writing' })?.id, 'b1')
  assert.equal(checkpointCriterion(goal, { title: 'Finish A2' }), undefined)
  assert.equal(checkpointCriterion(goal, { title: 'Mid-term check' }), undefined)
  assert.equal(checkpointCriterion(undefined, { title: 'Finish B1' }), undefined)
})

test('the minimum is kept once its activities are done, whatever the minutes, and extended never counts against the day', () => {
  // 2026-10-19 is a Monday.
  const plan = [
    activity('anki', 'words', 20, { tier: 'minimum' }),
    activity('listen', 'listening', 20, { tier: 'minimum' }),
    activity('record', 'speaking', 10, { tier: 'minimum' }),
    activity('book', 'reading', 30),
    activity('mock', 'reading', 45, { tier: 'extended' }),
  ]
  const minimumDone = [session('2026-10-19', 'words', 15, 'anki'), session('2026-10-19', 'listening', 20, 'listen'), session('2026-10-19', 'speaking', 10, 'record')]

  assert.deepEqual(minimumOn(plan, minimumDone, '2026-10-19'), { planned: 3, done: 3, kept: true })
  assert.deepEqual(minimumOn(plan, minimumDone.slice(1), '2026-10-19'), { planned: 3, done: 2, kept: false })
  assert.equal(minimumOn([activity('book', 'reading', 30)], [], '2026-10-19'), null)

  // The bar shows the true share of the plan: 45 of 80 planned minutes; the 45-minute extended mock isn't planned.
  const day = dayProgress(plan, minimumDone, '2026-10-19')
  assert.deepEqual([day.done, day.planned, day.pct], [45, 80, 56])
  assert.equal(weekBalance(plan, [], '2026-10-19', '2026-10-21').rows.find((row) => row.area === 'reading')?.plannedSoFar, 60)
})

test('the week counts days the minimum was kept; today only once it is', () => {
  const plan = [activity('anki', 'words', 20, { tier: 'minimum' })]
  const sessions = [session('2026-10-19', 'words', 20, 'anki'), session('2026-10-21', 'words', 20, 'anki')]
  assert.deepEqual(minimumWeek(plan, sessions, '2026-10-19', '2026-10-21'), { kept: 2, days: 3 })
  assert.deepEqual(minimumWeek(plan, sessions.slice(0, 1), '2026-10-19', '2026-10-21'), { kept: 1, days: 2 })
})
