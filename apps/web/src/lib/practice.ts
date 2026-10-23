// The language track: today's plan, how the week is balancing across the four skills, practice
// test results and the road to the exam, all derived from the plan and what was logged.
import { CEFR_LEVELS, LANGUAGE_SKILLS, PRACTICE_AREAS, PRACTICE_SLOTS } from '@hop/domain'
import * as D from './dates.ts'
import type { CefrLevel, Goal, HopData, LanguageSkill, LanguageTrack, Milestone, PracticeActivity, PracticeArea, PracticeSession, PracticeTest, PracticeTotals } from './types.ts'


/** A skill is "behind" when it has had less than this share of the week's plan so far. */
export const BEHIND_SHARE = 0.6

const zero = (): Record<PracticeArea, number> => Object.fromEntries(PRACTICE_AREAS.map((area) => [area, 0])) as Record<PracticeArea, number>

/** The activities planned on a day, in the order the day goes. */
export function planFor(activities: PracticeActivity[], ymd: string): PracticeActivity[] {
  const day = D.weekday(ymd)
  return activities
    .filter((a) => a.active && a.days.includes(day))
    .sort((a, b) => PRACTICE_SLOTS.indexOf(a.slot) - PRACTICE_SLOTS.indexOf(b.slot) || a.position - b.position)
}

export const sessionsOn = (sessions: PracticeSession[], ymd: string) => sessions.filter((s) => s.date === ymd)

/** The session that ticked an activity off on a day, if any. */
export const doneSession = (sessions: PracticeSession[], activity: Pick<PracticeActivity, 'id'>, ymd: string) =>
  sessions.find((s) => s.activityId === activity.id && s.date === ymd)

export type AreaMinutes = Record<PracticeArea, { planned: number; done: number }>

/** Planned and done minutes for one day, per area and in total. Practice outside the plan counts as done. */
export function dayProgress(activities: PracticeActivity[], sessions: PracticeSession[], ymd: string) {
  const areas = Object.fromEntries(PRACTICE_AREAS.map((area) => [area, { planned: 0, done: 0 }])) as AreaMinutes
  for (const a of planFor(activities, ymd)) areas[a.area].planned += a.minutes
  for (const s of sessionsOn(sessions, ymd)) areas[s.area].done += s.minutes
  const planned = PRACTICE_AREAS.reduce((sum, area) => sum + areas[area].planned, 0)
  const done = PRACTICE_AREAS.reduce((sum, area) => sum + areas[area].done, 0)
  return { areas, planned, done, pct: planned ? Math.min(100, Math.round((done / planned) * 100)) : done ? 100 : 0 }
}

export type SkillBalance = { area: PracticeArea; planned: number; plannedSoFar: number; done: number; share: number | null }

/**
 * How the week is going per area: minutes done (today included) against the plan for the days
 * already over, so a day isn't judged before it ends. `behind` is the exam skill furthest under
 * BEHIND_SHARE, if any; words and grammar support the four and aren't flagged.
 */
export function weekBalance(activities: PracticeActivity[], sessions: PracticeSession[], weekStart: string, today: string) {
  const end = D.addDays(weekStart, 6)
  const rows = Object.fromEntries(PRACTICE_AREAS.map((area) => [area, { area, planned: 0, plannedSoFar: 0, done: 0, share: null }])) as Record<PracticeArea, SkillBalance>
  for (let ymd = weekStart; ymd <= end; ymd = D.addDays(ymd, 1)) {
    for (const a of planFor(activities, ymd)) {
      rows[a.area].planned += a.minutes
      if (ymd < today) rows[a.area].plannedSoFar += a.minutes
    }
  }
  for (const s of sessions) if (s.date >= weekStart && s.date <= end) rows[s.area].done += s.minutes
  for (const row of Object.values(rows)) row.share = row.plannedSoFar ? row.done / row.plannedSoFar : null
  const behind = LANGUAGE_SKILLS.map((skill) => rows[skill])
    .filter((row) => row.share !== null && row.share < BEHIND_SHARE)
    .sort((a, b) => a.share! - b.share!)[0] ?? null
  const done = Object.values(rows).reduce((sum, row) => sum + row.done, 0)
  const planned = Object.values(rows).reduce((sum, row) => sum + row.planned, 0)
  return { rows: PRACTICE_AREAS.map((area) => rows[area]), behind, done, planned }
}

/** Days with any practice between two dates, inclusive. */
export const daysPractised = (sessions: PracticeSession[], from: string, to: string) => new Set(sessions.filter((s) => s.date >= from && s.date <= to).map((s) => s.date)).size

/** The last `count` weeks, newest first: minutes per area and days practised. */
export function recentWeeks(sessions: PracticeSession[], weekStart: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const start = D.addDays(weekStart, -7 * index)
    const end = D.addDays(start, 6)
    const minutes = zero()
    for (const s of sessions) if (s.date >= start && s.date <= end) minutes[s.area] += s.minutes
    return { start, minutes, total: PRACTICE_AREAS.reduce((sum, area) => sum + minutes[area], 0), days: daysPractised(sessions, start, end) }
  })
}

/** Minutes the plan asks for each week, per area. */
export function weeklyPlan(activities: PracticeActivity[]) {
  const minutes = zero()
  for (const a of activities) if (a.active) minutes[a.area] += a.minutes * a.days.length
  return { minutes, total: PRACTICE_AREAS.reduce((sum, area) => sum + minutes[area], 0) }
}

/** Planned minutes on each weekday, 0 Sunday … 6 Saturday. */
export const minutesByWeekday = (activities: PracticeActivity[]) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => activities.filter((a) => a.active && a.days.includes(day)).reduce((sum, a) => sum + a.minutes, 0))

/**
 * Totals after a change to the loaded sessions: minutes move by area, and a day counts while it
 * has any session. Changes only ever touch recent days, which are all loaded.
 */
export function adjustTotals(totals: PracticeTotals, before: PracticeSession[], after: PracticeSession[]): PracticeTotals {
  const minutes = { ...totals.minutes }
  for (const s of before) minutes[s.area] -= s.minutes
  for (const s of after) minutes[s.area] += s.minutes
  const daysBefore = new Set(before.map((s) => s.date))
  const daysAfter = new Set(after.map((s) => s.date))
  return { minutes, days: totals.days + daysAfter.size - daysBefore.size }
}

/* ---- Practice tests ------------------------------------------------------------------- */
export type TestResult = { score: number; max: number; complete: boolean; total: number | null; weakest: LanguageSkill | null; passed: boolean | null }

/**
 * A test's result: points taken, and with all four sections a total out of 100 and whether it
 * passes. The weakest section is the one with the lowest share of its points.
 */
export function testResult(test: PracticeTest, passMark: number): TestResult {
  const taken = LANGUAGE_SKILLS.filter((skill) => test.scores[skill] !== undefined)
  const score = taken.reduce((sum, skill) => sum + test.scores[skill]!, 0)
  const max = taken.reduce((sum, skill) => sum + test.max[skill], 0)
  const complete = taken.length === LANGUAGE_SKILLS.length
  const total = complete ? Math.round((score / max) * 100) : null
  const weakest = [...taken].sort((a, b) => test.scores[a]! / test.max[a] - test.scores[b]! / test.max[b])[0] ?? null
  return { score, max, complete, total, weakest, passed: total === null ? null : total >= passMark }
}

/** How often to take a practice test at each level: none in the basics, then closer together toward the exam. */
export const TEST_EVERY_DAYS: Record<CefrLevel, number | null> = { A1: null, A2: null, B1: 28, B2: 14, C1: 7, C2: 7 }

/** Whether a practice test is due, from the level's cadence and the last one taken. */
export function testDue(tests: PracticeTest[], level: CefrLevel, today: string) {
  const every = TEST_EVERY_DAYS[level]
  const last = [...tests].sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!every) return { due: false, every, last }
  return { due: !last || D.diffDays(today, last.date) >= every, every, last }
}

/* ---- The road -------------------------------------------------------------------------- */
export const nextLevel = (level: CefrLevel): CefrLevel => CEFR_LEVELS[Math.min(CEFR_LEVELS.length - 1, CEFR_LEVELS.indexOf(level) + 1)]!

/** The level checkpoints: the track goal's milestones, in date order, with the next one to reach. */
export function checkpoints(track: LanguageTrack, milestones: Milestone[]) {
  const list = milestones.filter((m) => m.goalId === track.goalId).sort((a, b) => a.date.localeCompare(b.date))
  return { list, next: list.find((m) => !m.done) ?? null }
}

/** The level a checkpoint finishes, read from its title ("Finish B1", "C1: …"). */
export const checkpointLevel = (m: Pick<Milestone, 'title'>): CefrLevel | null => (m.title.match(/\b(A1|A2|B1|B2|C1|C2)\b/)?.[1] as CefrLevel | undefined) ?? null

/**
 * The goal criterion a checkpoint ticks: the one with the same title, or, once either was renamed,
 * the open criterion for the same level ("Finish B1" and "B1 gate: speaking and writing").
 */
export function checkpointCriterion(goal: Pick<Goal, 'criteria'> | undefined, checkpoint: Pick<Milestone, 'title'>) {
  const open = goal?.criteria.filter((c) => !c.done) ?? []
  const level = checkpointLevel(checkpoint)
  return open.find((c) => c.text === checkpoint.title) ?? (level ? open.find((c) => checkpointLevel({ title: c.text }) === level) : undefined)
}

/** Today's minutes on the track, for the Learning figure on Today. */
export const practiceMinutesOn = (data: Pick<HopData, 'practiceSessions'>, ymd: string) => sessionsOn(data.practiceSessions, ymd).reduce((sum, s) => sum + s.minutes, 0)
