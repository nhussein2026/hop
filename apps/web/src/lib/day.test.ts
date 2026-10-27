import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { dayBlocks, dayRows, isTrackHabit, timetableLanes } from './day.ts'
import type { DayBlock } from './day.ts'
import type { Event, Habit, HopData, Task } from './types.ts'

setTimezone('UTC')

const stamp = '2026-10-01T00:00:00.000Z'

function empty(): HopData {
  return {
    settings: { languageTrack: { goalId: 'tr' } } as HopData['settings'], goals: [], tasks: [], taskCompletions: [], habits: [], completions: [], events: [], opportunities: [], projects: [], skills: [],
    evidence: [], weeklyReviews: [], monthlyReviews: [], milestones: [], contacts: [], interactions: [], resumes: [], reflections: [],
    terms: [], courses: [], keyDates: [], pins: [], uniLinks: [], resources: [], ideas: [], finds: [], books: [],
    practiceActivities: [], practiceSessions: [], practiceTests: [], languageChecks: [], practiceTotals: { minutes: { listening: 0, reading: 0, writing: 0, speaking: 0, words: 0 }, days: 0 }, accounts: [],
  }
}

const habit = (fields: Partial<Habit>) => ({ id: 'h', name: 'Habit', frequency: 'daily', targetPerWeek: 7, goalId: null, days: [0, 1, 2, 3, 4, 5, 6], minutes: 30, unit: 'minutes', target: 30, minimum: null, slots: [], active: true, createdAt: stamp, updatedAt: stamp, ...fields }) as Habit
const block = (start: string, end: string, title = start): DayBlock => ({ kind: 'habit', key: title, start, end, title, habit: habit({}) })

// 2026-11-04 is a Wednesday.
test('everything timed on a day comes in time order: timed habits, repeating work and repeating events', () => {
  const data = empty()
  data.habits = [
    habit({ id: 'turkce', name: 'Türkçe study block', goalId: 'tr', slots: [{ day: 3, start: '20:30', end: '22:15' }] }),
    habit({ id: 'hizb', name: 'Read Hizp of Quran', slots: [{ day: 3, start: '06:30', end: '07:15' }] }),
    habit({ id: 'untimed', name: 'Arabic poetry' }),
  ]
  data.tasks = [{ id: 'v', title: 'Veribir', description: null, status: 'todo', priority: 'medium', areaId: null, goalId: null, projectId: null, opportunityId: null, courseId: null, assessmentId: null,
    scheduledDate: null, dueDate: null, estimatedMinutes: null, repeat: [{ day: 3, start: '13:30', end: '15:50' }], completedAt: null, createdAt: stamp, updatedAt: stamp } as Task]
  data.events = [{ id: 'k', title: 'Kaleem meeting', description: null, type: 'meeting', date: '2026-10-01', startTime: null, endTime: null, goalId: null, projectId: null, opportunityId: null,
    repeat: [{ day: 3, start: '19:30', end: '20:30' }], skips: [], createdAt: stamp, updatedAt: stamp } as Event]

  const blocks = dayBlocks(data, '2026-11-04', '2026-11-04')
  assert.deepEqual(blocks.map((b) => `${b.start} ${b.title}`), ['06:30 Read Hizp of Quran', '13:30 Veribir', '19:30 Kaleem meeting', '20:30 Türkçe study block'])
  assert.equal(isTrackHabit(data.habits[0]!, data), true)
  assert.equal(dayBlocks(data, '2026-11-05', '2026-11-05').length, 0)
})

test('overlapping blocks share a row and a gap of 30 minutes or more is free time', () => {
  const rows = dayRows([block('19:00', '20:45', 'Türkçe'), block('19:30', '20:30', 'Kaleem'), block('21:00', '21:30', 'Fundamentals'), block('22:30', '24:00', 'Ride home')])
  assert.deepEqual(rows.map((r) => (r.kind === 'free' ? `free ${r.start}–${r.end} ${r.minutes}` : r.blocks.map((b) => b.title).join('+'))), [
    'Türkçe+Kaleem', 'Fundamentals', 'free 21:30–22:30 60', 'Ride home',
  ])
  // A 15-minute gap is not worth calling free.
  assert.equal(dayRows([block('12:45', '13:30'), block('13:45', '16:00')]).filter((r) => r.kind === 'free').length, 0)
})

test('on a timetable, overlapping blocks share their width; the rest take the whole column', () => {
  const lanes = timetableLanes([block('19:00', '20:45', 'Türkçe'), block('19:30', '20:30', 'Kaleem'), block('21:00', '21:30', 'Fundamentals'), block('21:00', '21:00', 'Call')])
  assert.deepEqual(lanes.map((l) => `${l.block.title} ${l.lane}/${l.lanes}`), ['Türkçe 0/2', 'Kaleem 1/2', 'Fundamentals 0/2', 'Call 1/2'])
  assert.deepEqual(timetableLanes([block('09:00', '10:00')]).map((l) => l.lanes), [1])
})
