import type { TimeSlot } from '@hop/domain';

/** The weekday of a calendar date (0 Sunday … 6 Saturday). A date has no timezone, so UTC is exact. */
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Does a weekly time happen on this date: its weekday, within its from/until? */
export const slotApplies = (slot: TimeSlot, date: string) =>
  weekdayOf(date) === slot.day && (!slot.from || date >= slot.from) && (!slot.until || date <= slot.until);

/** Weekdays of the times still running on `today`, or of all of them when none is. Sorted. */
export function slotDays(slots: TimeSlot[], today: string): number[] {
  const running = slots.filter((slot) => !slot.until || slot.until >= today);
  return [...new Set((running.length ? running : slots).map((slot) => slot.day))].sort((a, b) => a - b);
}
