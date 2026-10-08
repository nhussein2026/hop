// Hop's rules as pure functions: (data, today, settings) → what to show.
// Raw facts are stored; health, follow-ups, overdue and progress are derived here.
import * as D from './dates.ts'
import { GOAL_AREAS } from '@hop/domain'
import type { Goal, Habit, HabitCompletion, HopData, MonthFacts, MonthlyReview, Opportunity, OpportunityStage, Task, WeekFacts } from './types.ts'

/* ---- Opportunities ------------------------------------------------------- */
export const STAGES: OpportunityStage[] = ['saved', 'interested', 'preparing', 'applied', 'screening', 'interview', 'assessment', 'final', 'offer']
export const TERMINAL: OpportunityStage[] = ['accepted', 'declined', 'rejected', 'withdrawn', 'expired']
export const STAGE_LABEL: Record<OpportunityStage, string> = {
  saved: 'Saved', interested: 'Interested', preparing: 'Preparing', applied: 'Applied', screening: 'Screening',
  interview: 'Interview', assessment: 'Assessment', final: 'Final round', offer: 'Offer',
  accepted: 'Accepted', declined: 'Declined', rejected: 'Rejected', withdrawn: 'Withdrawn', expired: 'Expired',
}
const WAITING: OpportunityStage[] = ['applied', 'screening', 'assessment', 'final']

export const rank = (stage: OpportunityStage) => STAGES.indexOf(stage)
export const isClosed = (o: Pick<Opportunity, 'stage'>) => TERMINAL.includes(o.stage)
export const orgOf = (o: Pick<Opportunity, 'organization' | 'title'>) => o.organization || o.title

export type NextEvent = { date: string; time: string | null; label: string }

export function nextEvent(o: Opportunity): NextEvent | null {
  return o.nextEventDate ? { date: o.nextEventDate, time: o.nextEventTime, label: o.nextEventLabel || 'Next step' } : null
}

export function lastActivity(o: Opportunity): string | null {
  const dates = o.activities.map((activity) => D.ymdOf(activity.at)).sort()
  return dates.pop() ?? o.appliedDate ?? null
}

/** Follow-up rule: an open application in a waiting stage, quiet for N days, with nothing scheduled. */
export function followUp(o: Opportunity, today: string, days: number) {
  if (isClosed(o) || !WAITING.includes(o.stage)) return null
  const next = nextEvent(o)
  if (next && next.date >= today) return null
  const last = lastActivity(o)
  if (!last) return null
  const idle = D.diffDays(today, last)
  if (idle < days) return null
  return { idle, overdueBy: idle - days, dueOn: D.addDays(last, days) }
}

export type Tone = '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type OppHealth = { key: 'closed' | 'attention' | 'upcoming' | 'waiting' | 'active'; label: string; tone: Tone }

export function oppHealth(o: Opportunity, today: string, days: number): OppHealth {
  if (isClosed(o)) return { key: 'closed', label: 'Closed', tone: '' }
  if (o.stage === 'offer') return { key: 'attention', label: 'Respond to offer', tone: 'danger' }
  const notApplied = rank(o.stage) < rank('applied')
  if (notApplied && o.deadline) {
    const n = D.diffDays(o.deadline, today)
    if (n < 0) return { key: 'attention', label: 'Deadline passed', tone: 'danger' }
    if (n <= 2) return { key: 'attention', label: n === 0 ? 'Closes today' : n === 1 ? 'Closes tomorrow' : `Closes in ${n} days`, tone: 'warning' }
  }
  if (followUp(o, today, days)) return { key: 'attention', label: 'Follow-up due', tone: 'warning' }
  const next = nextEvent(o)
  if (next && next.date >= today && D.diffDays(next.date, today) <= 7) {
    const rel = D.relative(next.date, today)
    const when = rel === 'Today' || rel === 'Tomorrow' ? rel.toLowerCase() : rel
    return { key: 'upcoming', label: `${next.label} ${when}`, tone: 'info' }
  }
  if (WAITING.includes(o.stage) || o.stage === 'interview') return { key: 'waiting', label: 'Waiting on them', tone: '' }
  return { key: 'active', label: 'In your hands', tone: 'primary' }
}

/* ---- Goals ------------------------------------------------------------------ */
/** Progress is explainable: the share of success criteria met. */
/** Success criteria typed one per line. List markers are dropped and long lines are cut to fit. */
export function criteriaLines(text: string): string[] {
  return text.split('\n').map((line) => line.trim().replace(/^[-*•]\s*/, '').trim().slice(0, 160)).filter(Boolean)
}

export function goalProgress(g: Pick<Goal, 'criteria'>) {
  const total = g.criteria.length
  const done = g.criteria.filter((criterion) => criterion.done).length
  return { pct: total ? Math.round((done / total) * 100) : 0, done, total, measured: total > 0 }
}

/** Progress four weeks ago (or when tracking began), to explain the change since then. */
export function goalBaseline(g: Goal, today: string) {
  const windowStart = D.addDays(today, -28)
  const before = g.history.filter((point) => point.date <= windowStart).at(-1)
  return before ?? g.history[0] ?? null
}

export type GoalHealth = { label: string; tone: Tone; icon: string; detail?: string }

export function goalHealth(g: Goal, tasks: Task[], today: string): GoalHealth {
  if (g.status === 'paused') return { label: 'Paused', tone: '', icon: 'pause' }
  if (g.status === 'achieved') return { label: 'Achieved', tone: 'success', icon: 'check' }
  if (g.status === 'archived' || g.status === 'abandoned') return { label: 'Archived', tone: '', icon: 'archive' }
  if (!g.criteria.length) return { label: 'Not measured', tone: 'warning', icon: 'alert', detail: 'Add a success criterion so progress can be measured.' }
  const open = tasks.filter((t) => t.goalId === g.id && isOpen(t))
  if (!open.length) return { label: 'No next action', tone: 'warning', icon: 'alert', detail: 'Add one task that moves this goal.' }
  const idle = D.diffDays(today, D.ymdOf(g.updatedAt))
  const recentDone = tasks.some((t) => t.goalId === g.id && t.completedAt && D.diffDays(today, D.ymdOf(t.completedAt)) <= 14)
  if (idle > 14 && !recentDone) return { label: `Quiet for ${idle} days`, tone: 'warning', icon: 'alert' }
  return { label: 'On track', tone: 'success', icon: 'check' }
}

/* ---- Habits ------------------------------------------------------------------ */
export const habitDue = (h: Habit, ymd: string) => h.active && h.days.includes(D.weekday(ymd))
export const habitDone = (h: Pick<Habit, 'id'>, completions: HabitCompletion[], ymd: string) => completions.some((c) => c.habitId === h.id && c.date === ymd)

/** Consistency over the last four weeks of scheduled days: missing a day never resets anything. */
export function habitWeek(h: Habit, completions: HabitCompletion[], today: string) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const ymd = D.addDays(today, -i)
    days.push({ date: ymd, due: h.days.includes(D.weekday(ymd)), done: habitDone(h, completions, ymd), isToday: i === 0 })
  }
  const past: boolean[] = []
  for (let i = 1; i <= 28; i++) {
    const ymd = D.addDays(today, -i)
    if (h.days.includes(D.weekday(ymd))) past.push(habitDone(h, completions, ymd))
  }
  const done = past.filter(Boolean).length
  return { days, rate: past.length ? Math.round((done / past.length) * 100) : 0, done, scheduled: past.length }
}

export function daysLabel(days: number[]) {
  if (days.length === 7) return 'Every day'
  const set = [...days].sort().join(',')
  if (set === '1,2,3,4,5') return 'Weekdays'
  if (set === '0,6') return 'Weekends'
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => D.DAYS[d]).join(', ')
}

/* ---- Tasks ------------------------------------------------------------------- */
const PRIORITY = { high: 0, medium: 1, low: 2 }
export const isOpen = (t: Pick<Task, 'status'>) => t.status !== 'completed' && t.status !== 'cancelled'
/** Overdue is derived from the due date, never stored. */
export const isOverdue = (t: Task, today: string) => isOpen(t) && Boolean(t.dueDate) && t.dueDate! < today

export function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => {
    const p = PRIORITY[a.priority] - PRIORITY[b.priority]
    if (p) return p
    const ad = a.dueDate || a.scheduledDate || '9999'
    const bd = b.dueDate || b.scheduledDate || '9999'
    return ad.localeCompare(bd) || a.title.localeCompare(b.title)
  })
}

/** Today: Must = high priority, due by tomorrow, or overdue; Should = the rest planned for today or slipped. */
export function todayPlan(tasks: Task[], today: string) {
  const tomorrow = D.addDays(today, 1)
  const candidates = tasks.filter((t) => isOpen(t) && ((t.scheduledDate && t.scheduledDate <= today) || (t.dueDate && t.dueDate <= today)))
  const must = sortTasks(candidates.filter((t) => t.priority === 'high' || (t.dueDate && t.dueDate <= tomorrow)))
  const should = sortTasks(candidates.filter((t) => !must.includes(t)))
  return { must, should, all: [...must, ...should] }
}

/* ---- Needs attention ------------------------------------------------------------- */
export type AttentionItem = { level: 'critical' | 'important' | 'info'; icon: string; title: string; detail: string; href: string }

function prepLine(o: Opportunity) {
  if (!o.prep.length) return o.title
  const left = o.prep.filter((p) => !p.done).length
  return left ? `${o.title}. ${left} of ${o.prep.length} prep items left.` : `${o.title}. Prep complete.`
}

export function attention(s: HopData, today: string): AttentionItem[] {
  const items: AttentionItem[] = []
  const days = s.settings.followUpDays
  const flagged = new Set<string>()

  for (const o of s.opportunities) {
    if (isClosed(o)) continue
    const where = `#/career/${o.id}`
    const org = orgOf(o)
    if (o.stage === 'offer') {
      items.push({ level: 'critical', icon: 'award', title: `Offer from ${org} needs a response`, detail: o.title, href: where })
      flagged.add(o.id)
    }
    const next = nextEvent(o)
    if (next && next.date >= today) {
      const n = D.diffDays(next.date, today)
      if (n <= 3) {
        const when = n === 0 ? 'today' : n === 1 ? 'tomorrow' : D.relative(next.date, today)
        items.push({
          level: n <= 1 ? 'critical' : 'important',
          icon: next.label.toLowerCase().includes('interview') ? 'video' : 'clock',
          title: `${org} ${next.label.toLowerCase()} ${when}${next.time ? ` at ${next.time}` : ''}`,
          detail: prepLine(o),
          href: where,
        })
        flagged.add(o.id)
      }
    }
    if (o.deadline && rank(o.stage) < rank('applied')) {
      const n = D.diffDays(o.deadline, today)
      if (n >= 0 && n <= 2) {
        items.push({
          level: n <= 1 ? 'critical' : 'important',
          icon: 'flag',
          title: `${org} application closes ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : D.relative(o.deadline, today)}`,
          detail: `${o.title}. Stage: ${STAGE_LABEL[o.stage]}.`,
          href: where,
        })
        flagged.add(o.id)
      }
    }
    const fu = followUp(o, today, days)
    if (fu) {
      items.push({
        level: 'important',
        icon: 'reply',
        title: fu.overdueBy > 0 ? `Follow-up with ${org} overdue by ${fu.overdueBy} day${fu.overdueBy === 1 ? '' : 's'}` : `Follow up with ${org} today`,
        detail: `No reply for ${fu.idle} days on ${o.title}.`,
        href: where,
      })
      flagged.add(o.id)
    }
  }

  const overdue = s.tasks.filter((t) => isOverdue(t, today) && !(t.opportunityId && flagged.has(t.opportunityId)))
  if (overdue.length) {
    items.push({
      level: 'important',
      icon: 'clock',
      title: overdue.length === 1 ? `“${overdue[0]!.title}” is overdue` : `${overdue.length} tasks are overdue`,
      detail: overdue.length === 1 ? D.dueLabel(overdue[0]!.dueDate!, today) : 'Reschedule or finish them.',
      href: '#/plan/tasks',
    })
  }

  for (const g of s.goals) {
    if (g.status !== 'active') continue
    const h = goalHealth(g, s.tasks, today)
    if (h.tone === 'warning') items.push({ level: 'info', icon: 'target', title: `${g.name}: ${h.label.toLowerCase()}`, detail: h.detail || 'Pick the next small action.', href: `#/goals/${g.id}` })
  }

  const order = { critical: 0, important: 1, info: 2 }
  return items.sort((a, b) => order[a.level] - order[b.level])
}

/* ---- Agenda --------------------------------------------------------------------- */
export type AgendaItem =
  | { kind: 'event'; type: string; date: string; time: string | null; title: string; ref: HopData['events'][number] }
  | { kind: 'task'; type: 'task'; date: string; time: null; title: string; ref: Task }
  | { kind: 'deadline'; type: 'deadline'; date: string; time: null; title: string; ref: Opportunity }
  | { kind: 'oppEvent'; type: 'assessment'; date: string; time: string | null; title: string; ref: Opportunity }
  | { kind: 'milestone'; type: 'milestone'; date: string; time: null; title: string; ref: Goal }

export type AgendaGroup = { date: string; items: AgendaItem[] }

/**
 * Everything dated between two days (inclusive), in time order: events, tasks, application
 * deadlines, scheduled opportunity steps and goal milestones. The calendar also asks for
 * completed tasks, so past days show what was done.
 */
export function agendaItems(s: HopData, from: string, to: string, { includeDone = false } = {}): AgendaItem[] {
  const inRange = (d: string | null): d is string => Boolean(d) && d! >= from && d! <= to
  const items: AgendaItem[] = []
  for (const e of s.events) if (inRange(e.date)) items.push({ kind: 'event', type: e.type === 'other' || e.type === 'meeting' || e.type === 'personal' ? 'event' : e.type, date: e.date, time: e.startTime, title: e.title, ref: e })
  for (const t of s.tasks) {
    const open = isOpen(t)
    if (!open && !(includeDone && t.status === 'completed')) continue
    const d = t.scheduledDate || t.dueDate || (!open && t.completedAt ? D.ymdOf(t.completedAt) : null)
    if (inRange(d)) items.push({ kind: 'task', type: 'task', date: d, time: null, title: t.title, ref: t })
  }
  for (const o of s.opportunities) {
    if (isClosed(o)) continue
    if (o.deadline && rank(o.stage) < rank('applied') && inRange(o.deadline)) items.push({ kind: 'deadline', type: 'deadline', date: o.deadline, time: null, title: `${orgOf(o)} application deadline`, ref: o })
    const next = nextEvent(o)
    if (next && inRange(next.date) && !s.events.some((e) => e.opportunityId === o.id && e.date === next.date)) {
      items.push({ kind: 'oppEvent', type: 'assessment', date: next.date, time: next.time, title: `${orgOf(o)}: ${next.label}`, ref: o })
    }
  }
  const activeGoals = new Map(s.goals.filter((g) => g.status === 'active').map((g) => [g.id, g]))
  for (const m of s.milestones) {
    const g = m.goalId ? activeGoals.get(m.goalId) : undefined
    if (g && !m.done && inRange(m.date)) items.push({ kind: 'milestone', type: 'milestone', date: m.date, time: null, title: m.title, ref: g })
  }
  const kindOrder = { event: 0, oppEvent: 1, deadline: 2, milestone: 3, task: 4 }
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99') || kindOrder[a.kind] - kindOrder[b.kind])
}

/** Where an agenda entry leads: its opportunity, goal or the review. Tasks open their editor instead. */
export function agendaHref(item: AgendaItem) {
  if (item.kind === 'event') return item.ref.opportunityId ? `#/career/${item.ref.opportunityId}` : item.type === 'review' ? '#/review' : ''
  if (item.kind === 'milestone') return `#/goals/${item.ref.id}`
  return item.kind === 'task' ? '' : `#/career/${item.ref.id}`
}

/** Open items from `from` through the next `span` days, grouped by day. */
export function agenda(s: HopData, from: string, span: number): AgendaGroup[] {
  const groups: AgendaGroup[] = []
  for (const item of agendaItems(s, from, D.addDays(from, span))) {
    let group = groups.at(-1)
    if (!group || group.date !== item.date) groups.push((group = { date: item.date, items: [] }))
    group.items.push(item)
  }
  return groups
}

/* ---- Review facts ---------------------------------------------------------------- */
const RESPONSE_TYPES = ['email_received', 'call', 'interview_scheduled', 'assessment_received']

/** What Hop recorded between two dates (inclusive). Habits only count days up to today. */
function periodFacts(s: HopData, from: string, to: string, today: string): WeekFacts {
  const within = (ymd: string | null | undefined) => Boolean(ymd) && ymd! >= from && ymd! <= to
  const done = s.tasks.filter((t) => t.completedAt && within(D.ymdOf(t.completedAt)))
  let due = 0
  let hit = 0
  for (const h of s.habits) {
    for (let ymd = from; ymd <= to && ymd <= today; ymd = D.addDays(ymd, 1)) {
      if (!habitDue(h, ymd)) continue
      due++
      if (habitDone(h, s.completions, ymd)) hit++
    }
  }
  const learningGoals = new Set(s.goals.filter((g) => g.area === 'Learning').map((g) => g.id))
  const learningMin =
    done.filter((t) => t.goalId && learningGoals.has(t.goalId)).reduce((total, t) => total + (t.estimatedMinutes || 0), 0) +
    s.completions.filter((c) => within(c.date)).reduce((total, c) => {
      const h = s.habits.find((x) => x.id === c.habitId)
      return total + (h && h.goalId && learningGoals.has(h.goalId) ? h.minutes : 0)
    }, 0)
  const timeline = s.opportunities.flatMap((o) => o.activities)
  return {
    tasks: done.length,
    habitsPct: due ? Math.round((hit / due) * 100) : 0,
    learningMin,
    applications: s.opportunities.filter((o) => within(o.appliedDate)).length,
    responses: timeline.filter((e) => RESPONSE_TYPES.includes(e.type) && within(D.ymdOf(e.at))).length,
    interviews: s.events.filter((e) => e.type === 'interview' && within(e.date)).length + timeline.filter((e) => e.type === 'interview' && within(D.ymdOf(e.at))).length,
    shipped: done.filter((t) => t.projectId).map((t) => t.title),
    evidence: s.evidence.filter((e) => within(e.date)).map((e) => e.title),
  }
}

export function weekFacts(s: HopData, weekStart: string, today = D.today()): WeekFacts {
  return periodFacts(s, weekStart, D.addDays(weekStart, 6), today)
}

export const monthEnd = (monthStart: string) => D.addDays(D.addMonths(monthStart, 1), -1)

/**
 * The month to review: last month during the first week of a new month, until its review is
 * complete, otherwise the current month.
 */
export function reviewMonth(reviews: Pick<MonthlyReview, 'monthStart' | 'status'>[], today = D.today()) {
  const current = D.startOfMonth(today)
  const previous = D.addMonths(current, -1)
  const previousDone = reviews.some((r) => r.monthStart === previous && r.status === 'completed')
  return D.dayOfMonth(today) <= 7 && !previousDone ? previous : current
}

export function monthFacts(s: HopData, monthStart: string, today = D.today()): MonthFacts {
  const end = monthEnd(monthStart)
  const within = (ymd: string | null | undefined) => Boolean(ymd) && ymd! >= monthStart && ymd! <= end
  const base = periodFacts(s, monthStart, end, today)
  const doneTasks = s.tasks.filter((t) => t.completedAt && within(D.ymdOf(t.completedAt)))
  const checkIns = s.completions.filter((c) => within(c.date))
  const evidence = s.evidence.filter((e) => within(e.date))
  const reached = s.milestones.filter((m) => m.done && within(m.date))
  const meaningful = new Set([...doneTasks.map((t) => D.ymdOf(t.completedAt!)), ...checkIns.map((c) => c.date), ...evidence.map((e) => e.date!), ...reached.map((m) => m.date)])

  const goals = s.goals
    .filter((g) => g.status !== 'archived' && g.status !== 'abandoned' && D.ymdOf(g.createdAt) <= end)
    .map((g) => {
      const to = g.history.filter((point) => point.date <= end).at(-1)?.progress ?? g.progress
      const from = g.history.filter((point) => point.date < monthStart).at(-1)?.progress ?? (D.ymdOf(g.createdAt) >= monthStart ? 0 : to)
      return { name: g.name, from, to, active: g.status === 'active' }
    })
    .filter((g) => g.active || g.from !== g.to)
    .map(({ name, from, to }) => ({ name, from, to }))

  // An area is neglected when it has an active goal but nothing linked to its goals happened this month.
  const goalArea = new Map(s.goals.map((g) => [g.id, g.area]))
  const habitGoal = new Map(s.habits.map((h) => [h.id, h.goalId]))
  const touched = new Set([
    ...doneTasks.map((t) => t.goalId),
    ...checkIns.map((c) => habitGoal.get(c.habitId)),
    ...evidence.map((e) => e.goalId),
    ...reached.map((m) => m.goalId),
  ].map((id) => id && goalArea.get(id)).filter(Boolean))
  const activeAreas = new Set(s.goals.filter((g) => g.status === 'active' && g.area).map((g) => g.area!))
  const neglectedAreas = GOAL_AREAS.filter((area) => activeAreas.has(area) && !touched.has(area))

  const timeline = s.opportunities.flatMap((o) => o.activities)
  return {
    tasks: base.tasks,
    meaningfulDays: meaningful.size,
    habitsPct: base.habitsPct,
    learningMin: base.learningMin,
    applications: base.applications,
    responses: base.responses,
    interviews: base.interviews,
    offers: timeline.filter((e) => e.type === 'offer_received' && within(D.ymdOf(e.at))).length,
    goals,
    projectsCompleted: s.projects.filter((p) => p.status === 'deployed' && within(p.endDate)).map((p) => p.name),
    milestones: reached.map((m) => m.title),
    evidence: base.evidence,
    neglectedAreas,
  }
}

/* ---- Career analytics --------------------------------------------------------------- */
const reachedRank = (o: Opportunity) => rank(isClosed(o) ? o.reachedStage ?? 'applied' : o.stage)

export function funnel(opps: Opportunity[]) {
  const applied = opps.filter((o) => o.appliedDate)
  const reached = (o: Opportunity, stage: OpportunityStage) => reachedRank(o) >= rank(stage)
  return {
    n: applied.length,
    steps: [
      { key: 'applied', label: 'Applied', count: applied.length },
      { key: 'screening', label: 'Got a response', count: applied.filter((o) => reached(o, 'screening')).length },
      { key: 'interview', label: 'Interviewed', count: applied.filter((o) => reached(o, 'interview')).length },
      { key: 'assessment', label: 'Assessment', count: applied.filter((o) => reached(o, 'assessment')).length },
      { key: 'offer', label: 'Offer', count: applied.filter((o) => reached(o, 'offer')).length },
    ],
  }
}

export type GroupRate = { key: string; applied: number; responses: number; interviews: number; offers: number }

export function groupRates(opps: Opportunity[], keyOf: (o: Opportunity) => string | null | undefined): GroupRate[] {
  const map = new Map<string, GroupRate>()
  for (const o of opps.filter((x) => x.appliedDate)) {
    const key = keyOf(o) || 'Unknown'
    const group = map.get(key) ?? { key, applied: 0, responses: 0, interviews: 0, offers: 0 }
    group.applied++
    const r = reachedRank(o)
    if (r >= rank('screening')) group.responses++
    if (r >= rank('interview')) group.interviews++
    if (r >= rank('offer')) group.offers++
    map.set(key, group)
  }
  return [...map.values()].sort((a, b) => b.applied - a.applied)
}

/* ---- Search -------------------------------------------------------------------------- */
export type SearchResult = { group: string; icon: string; title: string; meta: string; href: string }

export function search(s: HopData, query: string): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const has = (...values: (string | null | undefined)[]) => values.filter(Boolean).join(' ').toLowerCase().includes(q)
  const out: SearchResult[] = []
  for (const g of s.goals) if (has(g.name, g.why)) out.push({ group: 'Goals', icon: 'goals', title: g.name, meta: g.status, href: `#/goals/${g.id}` })
  for (const t of s.tasks) if (has(t.title, t.description)) out.push({ group: 'Tasks', icon: 'check', title: t.title, meta: t.status === 'completed' ? 'Done' : t.dueDate ? D.dueLabel(t.dueDate) : 'Open', href: `#/plan/tasks?task=${t.id}` })
  for (const o of s.opportunities) if (has(o.title, o.organization, o.technologyTags.join(' '), o.notes)) out.push({ group: 'Opportunities', icon: 'career', title: `${orgOf(o)}: ${o.title}`, meta: STAGE_LABEL[o.stage], href: `#/career/${o.id}` })
  for (const c of s.contacts) if (has(c.name, c.organization, c.role)) out.push({ group: 'People', icon: 'user', title: c.name, meta: [c.role, c.organization].filter(Boolean).join(', '), href: `#/career/people?contact=${c.id}` })
  for (const k of s.skills) if (has(k.name, k.category)) out.push({ group: 'Skills', icon: 'growth', title: k.name, meta: k.level, href: `#/growth/skills?skill=${k.id}` })
  for (const p of s.projects) if (has(p.name, p.blurb, p.stack.join(' '))) out.push({ group: 'Projects', icon: 'code', title: p.name, meta: p.status, href: `#/growth/projects?project=${p.id}` })
  for (const e of s.evidence) if (has(e.title)) out.push({ group: 'Evidence', icon: 'award', title: e.title, meta: e.date ? D.short(e.date) : '', href: '#/growth/evidence' })
  return out.slice(0, 40)
}

const workModeLabel = { remote: 'remote', hybrid: 'hybrid', 'on-site': 'on-site' }

/** "Istanbul, hybrid" */
export function placeOf(o: Opportunity) {
  const place = [o.location, o.workMode ? workModeLabel[o.workMode] : null].filter(Boolean).join(', ')
  return place || 'Location not set'
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
