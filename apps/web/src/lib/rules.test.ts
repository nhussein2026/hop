import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { eventOccurrences, goalHealth, habitDue, habitMinutes, habitState, habitWeek, monthEnd, targetOn, workBetween, workFacts, zeroLastTime, monthFacts, nextForGoal, reviewMonth, todayPlan } from './rules.ts'
import type { Goal, Habit, HopData, Task } from './types.ts'

setTimezone('UTC')

const stamp = '2026-01-01T00:00:00.000Z'

function empty(): HopData {
  return {
    settings: {} as HopData['settings'], goals: [], tasks: [], taskCompletions: [], habits: [], completions: [], events: [], opportunities: [], projects: [], skills: [],
    evidence: [], weeklyReviews: [], monthlyReviews: [], milestones: [], contacts: [], interactions: [], resumes: [], reflections: [],
    terms: [], courses: [], keyDates: [], pins: [], uniLinks: [], resources: [], ideas: [], finds: [], books: [],
    practiceActivities: [], practiceSessions: [], practiceTests: [], languageChecks: [], practiceTotals: { minutes: { listening: 0, reading: 0, writing: 0, speaking: 0, words: 0 }, days: 0 }, accounts: [],
  }
}

const goal = (fields: Partial<Goal>): Goal => ({
  id: 'g', name: 'Goal', why: null, areaId: null, area: null, status: 'active', priority: 'medium', startDate: null, targetDate: null, successCriteria: null,
  progress: 0, completedAt: null, createdAt: stamp, updatedAt: stamp, archivedAt: null, criteria: [], history: [], ...fields,
})

const task = (fields: Partial<Task>): Task => ({
  id: 't', title: 'Task', description: null, status: 'completed', priority: 'medium', areaId: null, goalId: null, projectId: null, opportunityId: null,
  courseId: null, assessmentId: null, scheduledDate: null, dueDate: null, estimatedMinutes: null, repeat: null, completedAt: null, createdAt: stamp, updatedAt: stamp, ...fields,
})

test('monthEnd handles short months and leap years', () => {
  assert.equal(monthEnd('2026-10-01'), '2026-10-31')
  assert.equal(monthEnd('2026-02-01'), '2026-02-28')
  assert.equal(monthEnd('2028-02-01'), '2028-02-29')
})

test('reviewMonth offers last month during the first week until it is reviewed', () => {
  assert.equal(reviewMonth([], '2026-10-03'), '2026-09-01')
  assert.equal(reviewMonth([], '2026-10-07'), '2026-09-01')
  assert.equal(reviewMonth([], '2026-10-08'), '2026-10-01')
  assert.equal(reviewMonth([{ monthStart: '2026-09-01', status: 'completed' }], '2026-10-03'), '2026-10-01')
  assert.equal(reviewMonth([{ monthStart: '2026-09-01', status: 'draft' }], '2026-10-03'), '2026-09-01')
  assert.equal(reviewMonth([], '2027-01-02'), '2026-12-01')
})

test('monthFacts counts meaningful days once, however much happened that day', () => {
  const data = empty()
  const habit = { id: 'h', name: 'Study', frequency: 'daily', targetPerWeek: 7, goalId: null, days: [0, 1, 2, 3, 4, 5, 6], minutes: 30, unit: 'minutes', target: 30, minimum: null, slots: [], active: true, createdAt: stamp, updatedAt: stamp } as Habit
  data.habits = [habit]
  data.tasks = [
    task({ id: 'a', completedAt: '2026-09-03T10:00:00.000Z' }),
    task({ id: 'b', completedAt: '2026-09-03T15:00:00.000Z' }),
    task({ id: 'c', completedAt: '2026-08-31T10:00:00.000Z' }),
  ]
  data.completions = [{ id: 'c1', habitId: 'h', date: '2026-09-03', amount: null, completedAt: stamp }, { id: 'c2', habitId: 'h', date: '2026-09-10', amount: null, completedAt: stamp }]

  const facts = monthFacts(data, '2026-09-01', '2026-10-03')
  assert.equal(facts.tasks, 2)
  assert.equal(facts.meaningfulDays, 2)
  assert.equal(facts.habitsPct, 7)
})

test('monthFacts reports goal movement and areas with no activity', () => {
  const data = empty()
  data.goals = [
    goal({ id: 'career', name: 'Get a role', area: 'Career', progress: 50, history: [{ date: '2026-08-20', progress: 25 }, { date: '2026-09-15', progress: 50 }] }),
    goal({ id: 'health', name: 'Run 10k', area: 'Health', progress: 0 }),
    goal({ id: 'old', name: 'Archived', area: 'Finances', status: 'archived' }),
  ]
  data.tasks = [task({ goalId: 'career', completedAt: '2026-09-05T09:00:00.000Z' })]

  const facts = monthFacts(data, '2026-09-01', '2026-10-03')
  assert.deepEqual(facts.goals, [{ name: 'Get a role', from: 25, to: 50 }, { name: 'Run 10k', from: 0, to: 0 }])
  assert.deepEqual(facts.neglectedAreas, ['Health'])
})

test('habitWeek ignores days before the habit existed and counts today once it is done', () => {
  const habit = { id: 'h', name: 'Study', frequency: 'daily', targetPerWeek: 7, goalId: null, days: [0, 1, 2, 3, 4, 5, 6], minutes: 30, unit: 'minutes', target: 30, minimum: null, slots: [], active: true, createdAt: '2026-10-09T09:00:00.000Z', updatedAt: stamp } as Habit

  const fresh = habitWeek(habit, [], '2026-10-09')
  assert.equal(fresh.scheduled, 0)
  assert.equal(fresh.days.filter((d) => d.due).length, 1)

  const doneToday = habitWeek(habit, [{ id: 'c1', habitId: 'h', date: '2026-10-09', amount: null, completedAt: stamp }], '2026-10-09')
  assert.equal(doneToday.rate, 100)

  const twoDaysIn = habitWeek(habit, [{ id: 'c1', habitId: 'h', date: '2026-10-09', amount: null, completedAt: stamp }], '2026-10-11')
  assert.equal(twoDaysIn.scheduled, 2)
  assert.equal(twoDaysIn.rate, 50)
})

test('habitWeek still counts completions recorded before the habit’s creation date', () => {
  const habit = { id: 'h', name: 'Study', frequency: 'daily', targetPerWeek: 7, goalId: null, days: [0, 1, 2, 3, 4, 5, 6], minutes: 30, unit: 'minutes', target: 30, minimum: null, slots: [], active: true, createdAt: '2026-10-09T09:00:00.000Z', updatedAt: stamp } as Habit
  const week = habitWeek(habit, [{ id: 'c1', habitId: 'h', date: '2026-10-05', amount: null, completedAt: stamp }], '2026-10-10')
  assert.equal(week.scheduled, 2)
  assert.equal(week.done, 1)
})

test('the language track’s goal is moved by its daily plan, not only by tasks', () => {
  const g = goal({ id: 'tr', criteria: [{ id: 'c', goalId: 'tr', text: 'Finish A2', note: null, done: false, position: 0, createdAt: stamp, updatedAt: stamp }], updatedAt: '2026-09-01T00:00:00.000Z' })
  const data = empty()
  assert.equal(goalHealth(g, data, '2026-10-19').label, 'No next action')

  data.settings = { languageTrack: { goalId: 'tr' } } as HopData['settings']
  data.practiceActivities = [{ id: 'a', area: 'listening', tier: 'standard', title: 'Podcast', detail: '', minutes: 25, slot: 'commute', days: [1], position: 0, active: true, createdAt: stamp, updatedAt: stamp }]
  // Untouched since September and no practice logged: quiet.
  assert.equal(goalHealth(g, data, '2026-10-19').label, 'Quiet for 48 days')

  data.practiceSessions = [{ id: 's', date: '2026-10-18', area: 'listening', minutes: 25, activityId: 'a', note: '', createdAt: stamp }]
  assert.equal(goalHealth(g, data, '2026-10-19').label, 'On track')
})

test('nextForGoal picks the goal’s highest-priority open task, then the earliest planned, then the oldest', () => {
  const tasks = [
    task({ id: 'done', goalId: 'g', status: 'completed', priority: 'high' }),
    task({ id: 'other-goal', goalId: 'x', status: 'todo', priority: 'high' }),
    task({ id: 'old', goalId: 'g', status: 'todo', priority: 'medium', createdAt: '2026-09-01T00:00:00.000Z' }),
    task({ id: 'new', goalId: 'g', status: 'todo', priority: 'medium', createdAt: '2026-10-01T00:00:00.000Z' }),
    task({ id: 'planned', goalId: 'g', status: 'in_progress', priority: 'medium', scheduledDate: '2026-10-25', createdAt: '2026-10-10T00:00:00.000Z' }),
    task({ id: 'high', goalId: 'g', status: 'todo', priority: 'high', createdAt: '2026-10-15T00:00:00.000Z' }),
  ]
  const order: string[] = []
  for (let skipped: string[] = []; order.length < 4; skipped = [...skipped, order.at(-1)!]) order.push(nextForGoal('g', tasks, skipped).next!.id)
  assert.deepEqual(order, ['high', 'planned', 'old', 'new'])
  assert.equal(nextForGoal('g', tasks).open, 4)
  // Once every task has been skipped, it starts again from the top.
  assert.equal(nextForGoal('g', tasks, order).next?.id, 'high')
  assert.equal(nextForGoal('x', tasks.slice(0, 1)).next, undefined)
})

test('undated tasks stay out of Today’s plan', () => {
  const tasks = [task({ id: 'undated', status: 'todo', priority: 'high', goalId: 'g' }), task({ id: 'today', status: 'todo', scheduledDate: '2026-10-22' })]
  assert.deepEqual(todayPlan(tasks, '2026-10-22').all.map((t) => t.id), ['today'])
})

const reading = (fields: Partial<Habit> = {}) => ({ id: 'r', name: 'Read 10 pages', frequency: 'daily', targetPerWeek: 7, goalId: null, days: [0, 1, 2, 3, 4, 5, 6], minutes: 20, unit: 'pages', target: 10, minimum: 2, slots: [], active: true, createdAt: '2026-10-01T09:00:00.000Z', updatedAt: stamp, ...fields }) as Habit
const logged = (date: string, amount: number | null) => ({ id: `c-${date}`, habitId: 'r', date, amount, completedAt: stamp })

test('a day is done at the target, kept at the minimum, and anything less still shows', () => {
  const h = reading()
  assert.equal(habitState(h, [logged('2026-10-20', 12)], '2026-10-20'), 'done')
  assert.equal(habitState(h, [logged('2026-10-20', null)], '2026-10-20'), 'done')
  assert.equal(habitState(h, [logged('2026-10-20', 5)], '2026-10-20'), 'minimum')
  assert.equal(habitState(h, [logged('2026-10-20', 1)], '2026-10-20'), 'some')
  assert.equal(habitState(h, [], '2026-10-20'), 'none')
  // With no minimum, anything below the target is only "some".
  assert.equal(habitState(reading({ minimum: null }), [logged('2026-10-20', 5)], '2026-10-20'), 'some')
})

test('consistency counts kept days, minimum days among them, and a habit with no finished day is new', () => {
  const h = reading()
  const week = habitWeek(h, [logged('2026-10-18', 10), logged('2026-10-19', 3), logged('2026-10-20', 1)], '2026-10-21')
  assert.deepEqual([week.done, week.minimum, week.scheduled], [2, 1, 20])
  assert.deepEqual(week.days.slice(-4).map((d) => d.state), ['done', 'minimum', 'some', 'none'])
  assert.equal(habitWeek(reading({ createdAt: '2026-10-21T08:00:00.000Z' }), [], '2026-10-21').scheduled, 0)
})

test('never zero twice: today warns only after a scheduled day with nothing logged', () => {
  const weekdays = reading({ days: [1, 2, 3, 4, 5] })
  // Monday 19 Oct: nothing on Friday 16 Oct, the last scheduled day (the weekend doesn't count).
  assert.equal(zeroLastTime(weekdays, [], '2026-10-19'), true)
  assert.equal(zeroLastTime(weekdays, [logged('2026-10-16', 1)], '2026-10-19'), false)
  // Something logged today clears it; a brand-new habit has no "last time".
  assert.equal(zeroLastTime(weekdays, [logged('2026-10-19', 1)], '2026-10-19'), false)
  assert.equal(zeroLastTime(reading({ createdAt: '2026-10-19T08:00:00.000Z' }), [], '2026-10-19'), false)
})

test('learning minutes follow what was done', () => {
  assert.equal(habitMinutes(reading(), { amount: 5 }), 10)
  assert.equal(habitMinutes(reading(), { amount: null }), 20)
  assert.equal(habitMinutes(reading({ unit: 'minutes', target: 30, minutes: 30 }), { amount: 17 }), 17)
})

/* ---- Week plan ---- */
// 2026-11-23 and 2026-11-30 are Mondays; 2026-11-28 a Saturday.
test('a timed habit is due on the days of its times, within their dates, and is as long as that day’s times', () => {
  const mawaheb = reading({
    unit: 'minutes', target: 50, minimum: 15, days: [1, 6],
    slots: [
      { day: 1, start: '19:00', end: '20:45', until: '2026-11-29' },
      { day: 1, start: '21:30', end: '22:20', from: '2026-11-30' },
      { day: 6, start: '14:00', end: '17:00' },
    ],
  })
  assert.equal(habitDue(mawaheb, '2026-11-23'), true)
  assert.equal(habitDue(mawaheb, '2026-11-24'), false)
  assert.deepEqual([targetOn(mawaheb, '2026-11-23'), targetOn(mawaheb, '2026-11-30'), targetOn(mawaheb, '2026-11-28')], [105, 50, 180])
  // A tick without an amount is that day's whole length.
  assert.equal(habitState(mawaheb, [{ id: 'c', habitId: 'r', date: '2026-11-28', amount: 60, completedAt: stamp }], '2026-11-28'), 'minimum')
  assert.equal(habitMinutes(mawaheb, { amount: null, date: '2026-11-28' }), 180)
  // Counted in pages, a timed habit keeps its one target.
  assert.equal(targetOn(reading({ slots: [{ day: 1, start: '22:30', end: '23:00' }] }), '2026-11-23'), 10)
})

const work = (fields: Partial<Task>): Task => task({ id: 'v', title: 'Veribir', status: 'todo', createdAt: '2026-11-01T08:00:00.000Z', repeat: [{ day: 1, start: '13:30', end: '16:00' }, { day: 3, start: '13:30', end: '15:50' }], ...fields })

test('repeating work has one occurrence per time, ticked, skipped, missed or still open, from the day it was made', () => {
  const data = { tasks: [work({})], taskCompletions: [
    { id: 'a', taskId: 'v', date: '2026-11-02', skipped: false, completedAt: stamp },
    { id: 'b', taskId: 'v', date: '2026-11-04', skipped: true, completedAt: stamp },
  ] }
  const list = workBetween(data, '2026-10-26', '2026-11-11', '2026-11-10')
  assert.deepEqual(list.map((o) => `${o.date} ${o.start} ${o.state}`), ['2026-11-02 13:30 done', '2026-11-04 13:30 skipped', '2026-11-09 13:30 missed', '2026-11-11 13:30 open'])
  assert.deepEqual(workFacts(data, '2026-11-02', '2026-11-15', '2026-11-10'), [{ title: 'Veribir', done: 1, skipped: 1, missed: 1 }])

  // Completing the series stops it; an ordinary task never has occurrences.
  assert.equal(workBetween({ tasks: [work({ status: 'completed', completedAt: '2026-11-04T18:00:00.000Z' })], taskCompletions: [] }, '2026-11-01', '2026-11-30', '2026-11-30').length, 2)
  assert.equal(workBetween({ tasks: [task({ status: 'todo' })], taskCompletions: [] }, '2026-11-01', '2026-11-30', '2026-11-30').length, 0)
  // Slots with an end date stop then (Garanti until 31 Dec).
  assert.equal(workBetween({ tasks: [work({ repeat: [{ day: 5, start: '17:15', end: '19:15', until: '2026-12-31' }] })], taskCompletions: [] }, '2027-01-01', '2027-01-31', '2027-01-01').length, 0)
})

test('a repeating event has its own time on each day and skips the dates it was skipped', () => {
  const kaleem = { id: 'k', title: 'Kaleem meeting', description: null, type: 'meeting', date: '2026-11-01', startTime: null, endTime: null, goalId: null, projectId: null, opportunityId: null,
    repeat: [{ day: 3, start: '19:30', end: '20:30' }, { day: 0, start: '21:15', end: '22:15' }], skips: ['2026-11-08'], createdAt: stamp, updatedAt: stamp } as HopData['events'][number]
  assert.deepEqual(eventOccurrences(kaleem, '2026-11-02', '2026-11-15').map((o) => `${o.date} ${o.start}`), ['2026-11-04 19:30', '2026-11-11 19:30', '2026-11-15 21:15'])
  const once = { ...kaleem, repeat: null, skips: [], date: '2026-11-05', startTime: '10:00', endTime: '11:00' }
  assert.deepEqual(eventOccurrences(once, '2026-11-01', '2026-11-30').map((o) => `${o.date} ${o.start}–${o.end}`), ['2026-11-05 10:00–11:00'])
})
