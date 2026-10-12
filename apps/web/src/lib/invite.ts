// Reads one event from a calendar invitation so it can be added to Hop: the invite.ics file attached
// to invitation emails (RFC 5545), or an "Add to calendar" link for Google, Outlook or Yahoo that
// carries the details. Times are converted to the user's timezone, so the event lands on the day it
// happens for them.

export type InviteEvent = {
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  description: string | null
}

export type InviteResult = { ok: true; event: InviteEvent } | { ok: false; error: string }

/** A point in time from the invitation: a calendar day (all day) or a moment. */
type When = { allDay: true; date: string } | { allDay: false; ms: number }

const MAX_NOTES = 1000

export function readInvite(input: string, timezone: string): InviteResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Choose an invitation file or paste a link first.' }
  if (/BEGIN:VEVENT/i.test(text)) return readCalendarFile(text, timezone)
  // Some "iCal" buttons link to the file itself, written into the link.
  const inline = text.match(/data:text\/calendar[^,]*,([^\s"'<>]+)/)?.[1]
  if (inline) return readCalendarFile(decodeURIComponent(inline), timezone)
  const link = text.match(/https?:\/\/[^\s"'<>]+/)?.[0]
  if (link) return readLink(link.replace(/&amp;/g, '&'), timezone)
  return { ok: false, error: 'That isn’t an invitation file or an “Add to calendar” link.' }
}

/* ---- invite.ics ------------------------------------------------------------------------------ */
type Property = { value: string; params: Record<string, string> }

function readCalendarFile(text: string, timezone: string): InviteResult {
  // Long lines are folded: a line starting with a space or tab continues the previous one.
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const calendar = new Map<string, Property>()
  const event = new Map<string, Property>()
  // Which component each line belongs to. Only the first event counts, without its reminders (VALARM).
  const open: string[] = []
  let found = false
  for (const line of lines) {
    const property = parseLine(line)
    if (!property) continue
    const [name, value] = property
    if (name === 'BEGIN') { open.push(value.value.toUpperCase()); continue }
    if (name === 'END') { if (open.pop() === 'VEVENT') found = true; continue }
    const inside = open.at(-1)
    if (inside === 'VEVENT' && !found && !event.has(name)) event.set(name, value)
    if (inside === 'VCALENDAR' && !calendar.has(name)) calendar.set(name, value)
  }
  if (!found) return { ok: false, error: 'That file has no event in it.' }
  if (calendar.get('METHOD')?.value.toUpperCase() === 'CANCEL' || event.get('STATUS')?.value.toUpperCase() === 'CANCELLED') {
    return { ok: false, error: 'This invitation cancels an event, so there’s nothing to add.' }
  }

  const start = event.get('DTSTART')
  if (!start) return { ok: false, error: 'The invitation doesn’t say when the event starts.' }
  const startWhen = readWhen(start.value, start.params.TZID ?? null, timezone)
  if (!startWhen) return { ok: false, error: 'Hop couldn’t read the event’s start time.' }
  const endProperty = event.get('DTEND')
  const endWhen = endProperty ? readWhen(endProperty.value, endProperty.params.TZID ?? null, timezone) : null

  return {
    ok: true,
    event: build(startWhen, endWhen, timezone, {
      title: unescapeText(event.get('SUMMARY')?.value ?? ''),
      location: unescapeText(event.get('LOCATION')?.value ?? ''),
      meeting: event.get('X-GOOGLE-CONFERENCE')?.value ?? '',
      notes: unescapeText(event.get('DESCRIPTION')?.value ?? ''),
    }),
  }
}

/** Splits `NAME;PARAM=value:VALUE`, where a quoted parameter may itself contain colons. */
function parseLine(line: string): [string, Property] | null {
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted
    else if (line[i] === ':' && !quoted) {
      const [name = '', ...params] = line.slice(0, i).split(';')
      return [name.toUpperCase(), {
        value: line.slice(i + 1),
        params: Object.fromEntries(params.map((param) => {
          const [key = '', ...rest] = param.split('=')
          return [key.toUpperCase(), rest.join('=').replace(/^"|"$/g, '')]
        })),
      }]
    }
  }
  return null
}

function unescapeText(value: string) {
  return value.replace(/\\([nN,;\\])/g, (_, char: string) => (char === 'n' || char === 'N' ? '\n' : char))
}

/* ---- "Add to calendar" links ------------------------------------------------------------ */
type LinkText = { title: string; location: string; notes: string }

function readLink(link: string, timezone: string): InviteResult {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return { ok: false, error: 'That link isn’t complete. Copy the whole link and try again.' }
  }
  if (/\.ics$/i.test(url.pathname)) {
    return { ok: false, error: 'That link downloads a calendar file. Open it to save the .ics file, then choose it under Invitation file.' }
  }
  const host = url.hostname
  if (host.startsWith('outlook.')) return readOutlookLink(url.searchParams, timezone)
  if (host.endsWith('yahoo.com')) return readYahooLink(url.searchParams, timezone)
  return readGoogleLink(url.searchParams, timezone)
}

/** calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=START/END&details=…&location=…&ctz=… */
function readGoogleLink(params: URLSearchParams, timezone: string): InviteResult {
  const dates = params.get('dates')
  if (!dates) {
    return params.has('tmeid') || params.has('eid')
      ? { ok: false, error: 'This link only points to the event inside your Google Calendar; it doesn’t contain the event’s details. Use the invite.ics file attached to the invitation email instead.' }
      : { ok: false, error: 'That link doesn’t include the event’s date and time.' }
  }
  const [startValue = '', endValue = ''] = dates.split('/')
  const zone = params.get('ctz')
  return fromLink(readWhen(startValue, zone, timezone), endValue ? readWhen(endValue, zone, timezone) : null, timezone, {
    title: params.get('text') ?? '',
    location: params.get('location') ?? '',
    notes: params.get('details') ?? '',
  })
}

/** outlook.live.com (or outlook.office.com) …/deeplink/compose?subject=…&startdt=ISO&enddt=ISO&body=…&location=…&allday=true */
function readOutlookLink(params: URLSearchParams, timezone: string): InviteResult {
  const start = params.get('startdt')
  if (!start) return { ok: false, error: 'That link doesn’t include the event’s date and time.' }
  const end = params.get('enddt')
  const allDay = params.get('allday') === 'true'
  return fromLink(readIsoWhen(start, allDay, timezone), end ? readIsoWhen(end, allDay, timezone) : null, timezone, {
    title: params.get('subject') ?? '',
    location: params.get('location') ?? '',
    notes: params.get('body') ?? '',
  })
}

/** calendar.yahoo.com/?v=60&title=…&st=START&et=END (or dur=HHMM)&desc=…&in_loc=… */
function readYahooLink(params: URLSearchParams, timezone: string): InviteResult {
  const start = params.get('st')
  if (!start) return { ok: false, error: 'That link doesn’t include the event’s date and time.' }
  const startWhen = readWhen(start, null, timezone)
  let endWhen = params.get('et') ? readWhen(params.get('et')!, null, timezone) : null
  const duration = params.get('dur')?.match(/^(\d{2})(\d{2})$/)
  if (!endWhen && duration && startWhen && !startWhen.allDay) {
    endWhen = { allDay: false, ms: startWhen.ms + (Number(duration[1]) * 60 + Number(duration[2])) * 60_000 }
  }
  return fromLink(startWhen, endWhen, timezone, {
    title: params.get('title') ?? '',
    location: params.get('in_loc') ?? '',
    notes: params.get('desc') ?? '',
  })
}

function fromLink(start: When | null, end: When | null, timezone: string, text: LinkText): InviteResult {
  if (!start) return { ok: false, error: 'Hop couldn’t read the date in that link.' }
  return { ok: true, event: build(start, end, timezone, { ...text, meeting: '' }) }
}

/* ---- Dates and times ------------------------------------------------------------------------ */
/**
 * `20261015` is a calendar day. `20261015T140000Z` is UTC. `20261015T140000` is wall-clock time in
 * `zone`, or in the user's timezone when the invitation names none (or one Hop doesn't know, such as
 * Outlook's Windows zone names).
 */
function readWhen(value: string, zone: string | null, timezone: string): When | null {
  const day = value.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (day) return { allDay: true, date: `${day[1]}-${day[2]}-${day[3]}` }
  const moment = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (!moment) return null
  const [y, mo, d, h, mi, s] = moment.slice(1, 7).map(Number)
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!, s!)
  if (moment[7] === 'Z') return { allDay: false, ms: wall }
  return { allDay: false, ms: wallToInstant(wall, knownZone(zone) ?? timezone) }
}

/** `2026-10-16` (with `allday`), `2026-10-16T16:00:00Z`, `…+03:00`, or wall-clock `2026-10-16T19:00:00`. */
function readIsoWhen(value: string, allDay: boolean, timezone: string): When | null {
  const day = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!day) return null
  if (allDay) return { allDay: true, date: day[0] }
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : { allDay: false, ms }
  }
  const time = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!time) return { allDay: true, date: day[0] }
  return { allDay: false, ms: wallToInstant(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Number(time[1]), Number(time[2]), Number(time[3] ?? 0)), timezone) }
}

function knownZone(zone: string | null) {
  if (!zone) return null
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return zone
  } catch {
    return null
  }
}

/** The wall-clock time in `zone` at a moment, as if that wall time were UTC. */
function wallAt(ms: number, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(ms).map((part) => [part.type, part.value]))
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
}

/** The moment when the clocks in `zone` show `wall`. Checked twice so daylight-saving changes land right. */
function wallToInstant(wall: number, zone: string) {
  const first = wall - (wallAt(wall, zone) - wall)
  return wall - (wallAt(first, zone) - first)
}

function dayAndTime(ms: number, timezone: string) {
  const iso = new Date(wallAt(ms, timezone)).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

function previousDay(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) - 864e5).toISOString().slice(0, 10)
}

/* ---- The event Hop adds ------------------------------------------------------------------------ */
function build(start: When, end: When | null, timezone: string, text: { title: string; location: string; meeting: string; notes: string }): InviteEvent {
  const lines: string[] = []
  if (text.location) lines.push(`Where: ${text.location}`)
  if (text.meeting && !text.location.includes(text.meeting)) lines.push(`Join: ${text.meeting}`)

  let event: InviteEvent
  if (start.allDay) {
    // An all-day event's end date is the day after it finishes.
    const last = end?.allDay ? previousDay(end.date) : start.date
    if (last > start.date) lines.push(`Until ${last}`)
    event = { title: text.title.trim(), date: start.date, startTime: null, endTime: null, description: null }
  } else {
    const from = dayAndTime(start.ms, timezone)
    const to = end && !end.allDay ? dayAndTime(end.ms, timezone) : null
    const sameDay = to && to.date === from.date
    if (to && !sameDay) lines.push(`Ends ${to.date} at ${to.time}`)
    event = { title: text.title.trim(), date: from.date, startTime: from.time, endTime: sameDay ? to.time : null, description: null }
  }

  const notes = cleanNotes(text.notes)
  if (notes) lines.push(notes)
  const description = lines.join('\n\n')
  event.description = description ? (description.length > MAX_NOTES ? `${description.slice(0, MAX_NOTES - 1).trimEnd()}…` : description) : null
  return event
}

/** Drops HTML and Google's "Join with Google Meet … Please do not edit this section" block. */
function cleanNotes(notes: string) {
  return notes
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/-::~[:~]*::-[\s\S]*?-::~[:~]*::-/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
