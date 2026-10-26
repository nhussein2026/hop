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
