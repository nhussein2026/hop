// Weekly time slots ("every Monday 13:30–16:00, from date X to date Y") turned into dated
// occurrences. Classes use it now; timed habits, repeating work and repeating events will too.
import * as D from './dates.ts'
import type { TimeSlot } from './types.ts'

export type Occurrence<S extends TimeSlot = TimeSlot> = { date: string; start: string; end: string; slot: S }

/** Does the slot apply on this date: the right weekday, inside its from/until? */
export const slotOn = (slot: TimeSlot, ymd: string) =>
  D.weekday(ymd) === slot.day && (!slot.from || ymd >= slot.from) && (!slot.until || ymd <= slot.until)

/** Every occurrence of the slots between two dates (inclusive), by date then start. Skipped dates are left out. */
export function occurrences<S extends TimeSlot>(slots: S[], from: string, to: string, skips: string[] = []): Occurrence<S>[] {
  const out: Occurrence<S>[] = []
  if (!slots.length) return out
  const skipped = new Set(skips)
  for (let ymd = from; ymd <= to; ymd = D.addDays(ymd, 1)) {
    if (skipped.has(ymd)) continue
    for (const slot of slots) if (slotOn(slot, ymd)) out.push({ date: ymd, start: slot.start, end: slot.end, slot })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
}

/** Minutes between two "HH:MM" times; "24:00" counts as midnight at the end of the day. */
export const slotMinutes = (slot: Pick<TimeSlot, 'start' | 'end'>) => {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
  return minutes(slot.end) - minutes(slot.start)
}

/** The slots that apply on a date, in time order. */
export const slotsOn = <S extends TimeSlot>(slots: S[], ymd: string): S[] => slots.filter((slot) => slotOn(slot, ymd)).sort((a, b) => a.start.localeCompare(b.start))

/** Minutes of all the slots on a date. */
export const minutesOn = (slots: TimeSlot[], ymd: string) => slotsOn(slots, ymd).reduce((sum, slot) => sum + slotMinutes(slot), 0)

const WEEK = [1, 2, 3, 4, 5, 6, 0]

/** "Mon–Thu", "Mon, Wed", "Fri–Sun": runs of three or more days read as a range, Monday first. */
export function dayRange(days: number[]) {
  const runs: number[][] = []
  for (const day of WEEK.filter((d) => days.includes(d))) {
    const run = runs.at(-1)
    if (run && WEEK.indexOf(day) === WEEK.indexOf(run.at(-1)!) + 1) run.push(day)
    else runs.push([day])
  }
  return runs.map((run) => (run.length >= 3 ? `${D.DAYS[run[0]!]}–${D.DAYS[run.at(-1)!]}` : run.map((d) => D.DAYS[d]).join(', '))).join(', ')
}

/**
 * Slots at the same time (and place, and dates) on several days read as one:
 * "Mon–Thu 09:15–12:45; Fri 14:30–17:00 until 31 Dec".
 */
export function slotsLabel(slots: (TimeSlot & { room?: string })[]) {
  const byTime = new Map<string, number[]>()
  for (const slot of slots) {
    const dates = `${slot.from ? ` from ${D.short(slot.from)}` : ''}${slot.until ? ` until ${D.short(slot.until)}` : ''}`
    const time = `${slot.start}–${slot.end}${slot.room ? `, ${slot.room}` : ''}${dates}`
    byTime.set(time, [...(byTime.get(time) ?? []), slot.day])
  }
  return [...byTime].map(([time, days]) => `${dayRange(days)} ${time}`).join('; ')
}

/** The next time starts the day after the last one, at the same hours and dates: Mon–Fri takes four clicks. */
export const nextTimeSlot = (last?: TimeSlot): TimeSlot => (last ? { ...last, day: (last.day + 1) % 7 } : { day: 1, start: '09:00', end: '10:00' })

/** The first problem with a list of times, or an empty string. */
export function timeSlotsError(slots: TimeSlot[]) {
  for (const slot of slots) {
    if (!slot.start || !slot.end) return 'Each time needs a start and an end.'
    if (slot.end <= slot.start) return 'Each time must end after it starts. Use 00:00 for midnight.'
    if (slot.from && slot.until && slot.until < slot.from) return 'A last date can’t be before its first date.'
  }
  return ''
}

/** Times as they're saved: dates only where one was set. */
export const cleanSlots = (slots: TimeSlot[]): TimeSlot[] =>
  slots.map(({ day, start, end, from, until }) => ({ day, start, end, ...(from ? { from } : {}), ...(until ? { until } : {}) }))
