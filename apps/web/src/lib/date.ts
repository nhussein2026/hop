// Hop's date-only values (YYYY-MM-DD) follow the user's local calendar, not UTC.
// `toISOString().slice(0, 10)` would return yesterday's date late in the evening west of UTC
// or early in the morning east of it.

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** The local calendar date of `date` as YYYY-MM-DD. */
export function toLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The local calendar date of an ISO timestamp, such as a task's completedAt. */
export function timestampToLocalDate(timestamp: string): string {
  return toLocalDate(new Date(timestamp))
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  return toLocalDate(new Date(year, month - 1, day + days))
}

/** The Monday that starts the week containing a YYYY-MM-DD date. */
export function weekStartOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const weekday = new Date(year, month - 1, day).getDay()
  return addDays(date, weekday === 0 ? -6 : 1 - weekday)
}
