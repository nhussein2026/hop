// İTÜ and Radar rules as pure functions: terms, classes, deadlines, grade standing, final
// eligibility, and link recognition. Like rules.ts, raw facts are stored and all of this is derived.
import { EXAM_TYPES, FIND_STALE_DAYS } from '@hop/domain'
import * as D from './dates.ts'
import { occurrences, slotsLabel } from './schedule.ts'
import type { Assessment, AssessmentType, ClassSlot, Course, Find, FindKind, KeyDate, Term } from './types.ts'

/* ---- Terms and classes --------------------------------------------------------- */
export const currentTerm = (terms: Term[], today: string) => terms.find((t) => t.start <= today && t.end >= today) ?? null

/** "Week 3 of 14": counted from the term start, kept within the teaching weeks. */
export const termWeek = (term: Term, today: string, weeks: number) => Math.min(weeks, Math.max(1, Math.floor(D.diffDays(today, term.start) / 7) + 1))

export const taking = (courses: Course[]) => courses.filter((c) => c.status === 'taking')

type ClassMeeting = { course: Course; slot: ClassSlot; date: string }

/** What deciding a class day needs: the courses, their terms, and the holidays. */
export type ClassData = { courses: Course[]; terms: Term[]; keyDates: KeyDate[] }

/**
 * When a course's classes run: its own dates when it has them, else its term's. Null ends mean
 * open-ended, which is how a course without either has always behaved.
 */
export function courseDates(course: Course, terms: Term[]): { from: string | null; until: string | null } {
  if (course.startDate || course.endDate) return { from: course.startDate, until: course.endDate }
  const term = course.termId ? terms.find((t) => t.id === course.termId) : undefined
  return term ? { from: term.start, until: term.end } : { from: null, until: null }
}

/** Every class of the courses being taken between two dates (inclusive), except on holidays. */
export function classesBetween(s: ClassData, from: string, to: string): ClassMeeting[] {
  const holidays = s.keyDates.filter((k) => k.kind === 'holiday').map((k) => k.date)
  return taking(s.courses)
    .flatMap((course) => {
      const dates = courseDates(course, s.terms)
      return occurrences(course.schedule.map((slot) => ({ ...slot, ...dates })), from, to, holidays)
        .map(({ date, slot }) => ({ course, slot, date }))
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot.start.localeCompare(b.slot.start))
}

export const classesOn = (s: ClassData, ymd: string): ClassMeeting[] => classesBetween(s, ymd, ymd)

/** The first class in the coming week, after today. */
export const nextClass = (s: ClassData, today: string): ClassMeeting | null => classesBetween(s, D.addDays(today, 1), D.addDays(today, 7))[0] ?? null

/** "Classes 30 Nov – 15 Jan", from the course's own dates. Empty when it follows its term. */
export function classDates(c: Course) {
  if (c.startDate && c.endDate) return `Classes ${D.short(c.startDate)} – ${D.short(c.endDate)}`
  if (c.startDate) return `Classes from ${D.short(c.startDate)}`
  return c.endDate ? `Classes until ${D.short(c.endDate)}` : ''
}

/** A course with classes but no dates of its own and no term shows its classes every week, with no end. */
export const classesUndated = (course: Course) => course.schedule.length > 0 && !course.startDate && !course.endDate && !course.termId

/** Classes at the same time and place on several days read as one: "Mon–Thu 09:15–12:45". */
export const scheduleLabel = (course: Pick<Course, 'schedule'>) => slotsLabel(course.schedule)

/* ---- Graded items ------------------------------------------------------------------ */
export const isExam = (a: Pick<Assessment, 'type'>) => EXAM_TYPES.includes(a.type)
/** Sat in class rather than handed in. These get a prep task, not a "submitted" tick. */
export const satInClass = (a: Pick<Assessment, 'type'>) => isExam(a) || a.type === 'presentation'
/** Still ahead: not handed in and not graded. */
export const isPending = (a: Pick<Assessment, 'submitted' | 'score'>) => !a.submitted && a.score === null

/** "today", "tomorrow", "on Thursday", "Mon 26 Oct", for the middle of a sentence. */
export function whenWord(ymd: string, today: string) {
  const n = D.diffDays(ymd, today)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n > 1 && n < 7) return `on ${D.relative(ymd, today)}`
  return D.withDay(ymd)
}

/** A due time worth showing: midnight hand-ins are the default, so 23:59 is left out. */
export const dueTime = (a: Pick<Assessment, 'time'>) => (a.time && a.time !== '23:59' ? a.time : null)

type Deadline = { course: Course; item: Assessment; days: number }

/** Pending graded items in courses you're taking, due from today through the next `days` days. */
export function upcoming(courses: Course[], today: string, days: number): Deadline[] {
  return taking(courses)
    .flatMap((course) => course.grading
      .filter((item) => item.due && isPending(item) && item.due >= today && D.diffDays(item.due, today) <= days)
      .map((item) => ({ course, item, days: D.diffDays(item.due!, today) })))
    .sort((a, b) => a.item.due!.localeCompare(b.item.due!) || (a.item.time ?? '').localeCompare(b.item.time ?? ''))
}

/** Hand-ins from the last week that were never marked submitted. Exams can't be missed this way. */
export function unsubmitted(courses: Course[], today: string): Deadline[] {
  return taking(courses).flatMap((course) => course.grading
    .filter((item) => item.due && isPending(item) && !satInClass(item) && item.due < today && D.diffDays(today, item.due) <= 7)
    .map((item) => ({ course, item, days: D.diffDays(item.due!, today) })))
}

export type Standing = {
  /** Weight of all graded items, normally 100. */
  totalWeight: number
  gradedWeight: number
  /** Points earned so far, out of `totalWeight`. */
  points: number
  /** Weighted average of the graded items, or null before any score. */
  average: number | null
  remainingWeight: number
  /** The average needed on what's left to reach the target, or null without a target. */
  need: number | null
}

/**
 * Grade standing from the facts the syllabus gives: weights and scores. No letter-grade
 * prediction, because grading may be relative.
 */
export function standing(course: Pick<Course, 'grading' | 'target'>): Standing {
  const totalWeight = course.grading.reduce((sum, a) => sum + a.weight, 0)
  const graded = course.grading.filter((a) => a.score !== null)
  const gradedWeight = graded.reduce((sum, a) => sum + a.weight, 0)
  const points = graded.reduce((sum, a) => sum + (a.weight * a.score!) / 100, 0)
  const average = gradedWeight ? Math.round((points / gradedWeight) * 1000) / 10 : null
  const remainingWeight = totalWeight - gradedWeight
  const need = remainingWeight > 0 && course.target ? Math.ceil(((course.target * totalWeight) / 100 - points) / (remainingWeight / 100)) : null
  return { totalWeight, gradedWeight, points: Math.round(points * 10) / 10, average, remainingWeight, need }
}

type Eligibility = {
  /** Weighted average of in-term scores (everything but the final). */
  average: number | null
  /** Absences left before VF, or null without a limit. */
  left: number | null
  gradeOk: boolean
  attendanceOk: boolean
  /** Below the limit, out of absences, or one absence from VF. */
  atRisk: boolean
}

/** Final eligibility (VF): an in-term minimum and an absence limit, both set by the syllabus. */
export function eligibility(course: Pick<Course, 'vf' | 'grading' | 'absences'>): Eligibility | null {
  if (!course.vf) return null
  const inTerm = course.grading.filter((a) => a.type !== 'final' && a.score !== null)
  const weight = inTerm.reduce((sum, a) => sum + a.weight, 0)
  const average = weight ? Math.round(inTerm.reduce((sum, a) => sum + a.weight * a.score!, 0) / weight) : null
  const left = course.vf.maxAbsences !== null ? course.vf.maxAbsences - course.absences : null
  const gradeOk = average === null || course.vf.minInTerm === null || average >= course.vf.minInTerm
  const attendanceOk = left === null || left >= 0
  return { average, left, gradeOk, attendanceOk, atRisk: !gradeOk || !attendanceOk || (left !== null && left <= 1) }
}

/** Guess an item's type from its name in a syllabus: "Midterm", "Ara sınav", "Quiz 2", "Proje". */
function guessType(title: string): AssessmentType {
  const t = title.toLowerCase()
  if (/final/.test(t)) return 'final'
  if (/mid|ara/.test(t)) return 'midterm'
  if (/quiz/.test(t)) return 'quiz'
  if (/project|proje/.test(t)) return 'project'
  if (/present|sunum/.test(t)) return 'presentation'
  if (/lab/.test(t)) return 'lab'
  return 'homework'
}

type GradingLine = { title: string; type: AssessmentType; weight: number }

/** Read grading pasted from a syllabus, one item per line: "Homework 20", "Midterm: 30%". */
export function parseGrading(text: string): { items: GradingLine[] } | { error: string } {
  const items: GradingLine[] = []
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const match = line.match(/^(.*?)[\s:,-]+(\d{1,3})\s*%?$/)
    if (!match || !match[1]!.trim()) return { error: `Couldn’t read “${line}”. Write a name then a number, like “Midterm 30”.` }
    const title = match[1]!.trim()
    items.push({ title, type: guessType(title), weight: Number(match[2]) })
  }
  const sum = items.reduce((total, item) => total + item.weight, 0)
  if (items.length && sum !== 100) return { error: `Weights add up to ${sum}%. They should add up to 100%.` }
  return { items }
}

/* ---- Radar ---------------------------------------------------------------------- */
export const findAgeDays = (f: Pick<Find, 'createdAt'>, today: string) => D.diffDays(today, D.ymdOf(f.createdAt))

/** Inbox finds nobody has decided on for a month. */
export const staleFinds = (finds: Find[], today: string) => finds.filter((f) => f.status === 'inbox' && findAgeDays(f, today) > FIND_STALE_DAYS)

export type DetectedLink = { kind: FindKind; source: string; title: string }

/** Recognise common sources from a pasted link, without the network. */
export function detectLink(raw: string): DetectedLink | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null
  const host = url.hostname.replace(/^www\./, '')
  const parts = url.pathname.split('/').filter(Boolean)
  if (host === 'github.com' && parts.length >= 2) return { kind: 'repo', source: 'GitHub', title: `${parts[0]}/${parts[1]}` }
  if (host === 'huggingface.co' && parts[0] === 'datasets' && parts.length >= 3) return { kind: 'dataset', source: 'Hugging Face', title: `${parts[1]}/${parts[2]}` }
  if (host === 'huggingface.co' && parts.length >= 2 && parts[0] !== 'spaces' && parts[0] !== 'docs') return { kind: 'model', source: 'Hugging Face', title: `${parts[0]}/${parts[1]}` }
  if (host === 'arxiv.org' && parts.length >= 2) return { kind: 'paper', source: 'arXiv', title: `arXiv ${parts[1]!.replace(/\.pdf$/, '')}` }
  if (host === 'itu.edu.tr' || host.endsWith('.itu.edu.tr')) return { kind: 'event', source: 'İTÜ', title: '' }
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return { kind: 'article', source: 'YouTube', title: '' }
  if (/(^|\.)kaggle\.com$/.test(host)) return { kind: 'dataset', source: 'Kaggle', title: '' }
  if (!parts.length) return { kind: 'site', source: host, title: host }
  return { kind: 'article', source: host, title: '' }
}

export const splitList = (value: string) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
