import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { monthEnd, monthFacts, reviewMonth } from './rules.ts'
import type { Goal, Habit, HopData, Task } from './types.ts'

setTimezone('UTC')

const stamp = '2026-01-01T00:00:00.000Z'

function empty(): HopData {
  return {
    settings: {} as HopData['settings'], goals: [], tasks: [], habits: [], completions: [], events: [], opportunities: [], projects: [], skills: [],
    evidence: [], weeklyReviews: [], monthlyReviews: [], milestones: [], contacts: [], interactions: [], resumes: [], reflections: [],
  }
}

const goal = (fields: Partial<Goal>): Goal => ({
  id: 'g', name: 'Goal', why: null, areaId: null, area: null, status: 'active', priority: 'medium', startDate: null, targetDate: null, successCriteria: null,
  progress: 0, completedAt: null, createdAt: stamp, updatedAt: stamp, archivedAt: null, criteria: [], history: [], ...fields,
})

const task = (fields: Partial<Task>): Task => ({
  id: 't', title: 'Task', description: null, status: 'completed', priority: 'medium', areaId: null, goalId: null, projectId: null, opportunityId: null,
  scheduledDate: null, dueDate: null, estimatedMinutes: null, completedAt: null, createdAt: stamp, updatedAt: stamp, ...fields,
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
  const habit = { id: 'h', name: 'Study', frequency: 'daily', targetPerWeek: 7, goalId: null, days: [0, 1, 2, 3, 4, 5, 6], minutes: 30, active: true, createdAt: stamp, updatedAt: stamp } as Habit
  data.habits = [habit]
  data.tasks = [
    task({ id: 'a', completedAt: '2026-09-03T10:00:00.000Z' }),
    task({ id: 'b', completedAt: '2026-09-03T15:00:00.000Z' }),
    task({ id: 'c', completedAt: '2026-08-31T10:00:00.000Z' }),
  ]
  data.completions = [{ id: 'c1', habitId: 'h', date: '2026-09-03', completedAt: stamp }, { id: 'c2', habitId: 'h', date: '2026-09-10', completedAt: stamp }]

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
