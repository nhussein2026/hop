// Hop's date-only values (YYYY-MM-DD) follow the user's calendar in their configured timezone,
// never the UTC date: `toISOString().slice(0, 10)` is yesterday late in the evening west of UTC.
// Date-only arithmetic happens at noon UTC so daylight saving never shifts the day.

let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export function setTimezone(value: string) {
  timezone = value
}

export function getTimezone() {
  return timezone
}

function ymdIn(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Today's date in the user's timezone. */
export const today = () => ymdIn(new Date())

/** The local date of an ISO timestamp, such as a task's completedAt. */
export const ymdOf = (iso: string) => ymdIn(new Date(iso))

export const hourNow = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hour12: false }).format(new Date()))

const parse = (ymd: string) => new Date(`${ymd}T12:00:00Z`)
const format = (date: Date) => date.toISOString().slice(0, 10)

export function addDays(ymd: string, days: number) {
  const date = parse(ymd)
  date.setUTCDate(date.getUTCDate() + days)
  return format(date)
}

/** a − b in whole days. */
export const diffDays = (a: string, b: string) => Math.round((parse(a).getTime() - parse(b).getTime()) / 864e5)

/** 0 Sunday … 6 Saturday. */
export const weekday = (ymd: string) => parse(ymd).getUTCDay()

export function startOfWeek(ymd: string, weekStart: number) {
  return addDays(ymd, -((weekday(ymd) - weekStart + 7) % 7))
}

/** The same day in another month, kept inside that month: 31 Jan + 1 month is 28 or 29 Feb. */
export function addMonths(ymd: string, months: number) {
  const date = parse(ymd)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return format(date)
}

export const startOfMonth = (ymd: string) => `${ymd.slice(0, 8)}01`
export const dayOfMonth = (ymd: string) => parse(ymd).getUTCDate()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function short(ymd: string) {
  const date = parse(ymd)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

export const withDay = (ymd: string) => `${DAYS[weekday(ymd)]} ${short(ymd)}`

export function long(ymd: string) {
  const date = parse(ymd)
  return `${DAYS_LONG[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "October 2026" */
export function monthLong(ymd: string) {
  const date = parse(ymd)
  return `${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function monthYear(ymd: string) {
  const date = parse(ymd)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** Concrete relative labels: "Today", "Tomorrow", "Thursday", "3 days ago", "Mon 14 Oct". */
export function relative(ymd: string, from = today()) {
  const days = diffDays(ymd, from)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1 && days < 7) return DAYS_LONG[weekday(ymd)]!
  if (days < 0 && days > -7) return `${-days} days ago`
  return withDay(ymd)
}

export function dueLabel(ymd: string, from = today()) {
  const days = diffDays(ymd, from)
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due ${relative(ymd, from)}`
}

export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 6e4)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
}

export function minutes(value: number | null | undefined) {
  if (!value) return ''
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
