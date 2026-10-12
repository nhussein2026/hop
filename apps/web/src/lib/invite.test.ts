import assert from 'node:assert/strict'
import test from 'node:test'
import { readInvite } from './invite.ts'

const TZ = 'Europe/Istanbul'

/** An invitation shaped like Google's invite.ics, with a Meet block, a reminder and folded lines. */
const googleInvite = [
  'BEGIN:VCALENDAR',
  'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'VERSION:2.0',
  'METHOD:REQUEST',
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Istanbul',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0300',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Europe/Istanbul:20261015T140000',
  'DTEND;TZID=Europe/Istanbul:20261015T150000',
  'ORGANIZER;CN="Demir, Ayşe":mailto:ayse@example.com',
  'UID:04d7r11m98606sqpa0hgltbmg8@google.com',
  'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=',
  ' TRUE;CN=naser738nas@gmail.com:mailto:naser738nas@gmail.com',
  'X-GOOGLE-CONFERENCE:https://meet.google.com/abc-defg-hij',
  'DESCRIPTION:Let\'s go over the thesis proposal.\\n\\n-::~:~::~:~:~:~:~:~:~:~:~',
  ' :~:~:~:~:~:~:~:~::~:~::-\\nJoin with Google Meet: https://meet.google.com/abc-',
  ' defg-hij\\n\\nPlease do not edit this section.\\n-::~:~::~:~:~:~:~:~:~:~:~:~:~',
  ' :~:~:~:~:~:~::~:~::-',
  'LOCATION:EEB 5302\\, İTÜ Ayazağa',
  'STATUS:CONFIRMED',
  'SUMMARY:Thesis meeting with Ayşe',
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  'DESCRIPTION:This is an event reminder',
  'TRIGGER:-P0DT0H30M0S',
  'END:VALARM',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

/** A minimal invitation around the given event lines. */
const invite = (...eventLines: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:Call', ...eventLines, 'END:VEVENT', 'END:VCALENDAR'].join('\n')

function event(input: string) {
  const result = readInvite(input, TZ)
  assert.ok(result.ok, result.ok ? '' : result.error)
  return result.event
}

function error(input: string) {
  const result = readInvite(input, TZ)
  assert.equal(result.ok, false)
  return result.ok ? '' : result.error
}

test('a Google invitation fills the title, day, times and useful notes', () => {
  assert.deepEqual(event(googleInvite), {
    title: 'Thesis meeting with Ayşe',
    date: '2026-10-15',
    startTime: '14:00',
    endTime: '15:00',
    description: 'Where: EEB 5302, İTÜ Ayazağa\n\nJoin: https://meet.google.com/abc-defg-hij\n\nLet\'s go over the thesis proposal.',
  })
})

test('UTC times become local times, including the day they fall on', () => {
  assert.deepEqual(
    [event(invite('DTSTART:20261015T110000Z', 'DTEND:20261015T120000Z'))].map((e) => [e.date, e.startTime, e.endTime]),
    [['2026-10-15', '14:00', '15:00']],
  )
  assert.equal(event(invite('DTSTART:20261015T220000Z')).date, '2026-10-16')
})

test('times in another timezone are converted, on both sides of a daylight-saving change', () => {
  assert.equal(event(invite('DTSTART;TZID=America/New_York:20261015T090000')).startTime, '16:00')
  // Berlin moves from UTC+2 to UTC+1 on 25 October 2026.
  assert.equal(event(invite('DTSTART;TZID=Europe/Berlin:20261024T090000')).startTime, '10:00')
  assert.equal(event(invite('DTSTART;TZID=Europe/Berlin:20261026T090000')).startTime, '11:00')
})

test('times without a known timezone are read as the user’s own', () => {
  assert.equal(event(invite('DTSTART;TZID=Turkey Standard Time:20261015T140000')).startTime, '14:00')
  assert.equal(event(invite('DTSTART:20261015T140000')).startTime, '14:00')
})

test('all-day events have no times, and longer ones say until when', () => {
  const day = event(invite('DTSTART;VALUE=DATE:20261020', 'DTEND;VALUE=DATE:20261021'))
  assert.deepEqual([day.date, day.startTime, day.endTime, day.description], ['2026-10-20', null, null, null])
  assert.equal(event(invite('DTSTART;VALUE=DATE:20261020', 'DTEND;VALUE=DATE:20261023')).description, 'Until 2026-10-22')
})

test('an event that ends after midnight keeps its start and notes the end', () => {
  const late = event(invite('DTSTART:20261015T200000Z', 'DTEND:20261015T220000Z'))
  assert.deepEqual([late.date, late.startTime, late.endTime, late.description], ['2026-10-15', '23:00', null, 'Ends 2026-10-16 at 01:00'])
})

test('a cancellation is refused', () => {
  assert.match(error(googleInvite.replace('METHOD:REQUEST', 'METHOD:CANCEL')), /cancels/)
  assert.match(error(invite('DTSTART:20261015T110000Z', 'STATUS:CANCELLED')), /cancels/)
})

test('a Google link that only points to an event asks for the invitation file instead', () => {
  const link = 'https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=MDRkN3IxMW05ODYwNnNxcGEwaGdsdGJtZzggbmFzZXI3MzhuYXNAbQ&tmsrc=naser738nas%40gmail.com'
  assert.match(error(link), /invite\.ics/)
  // As it arrives in an email's HTML.
  assert.match(error(`<a target="_blank" href="${link.replace(/&/g, '&amp;')}"><img border="0" src="https://calendar.google.com/calendar/images/ext/gc_button1_en.gif"></a>`), /invite\.ics/)
})

test('an “Add to Google Calendar” link with details fills the event', () => {
  const link = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=ML+Meetup&dates=20261020T160000Z/20261020T180000Z&details=Talks+and+pizza&location=ARI+Teknokent'
  assert.deepEqual(event(link), { title: 'ML Meetup', date: '2026-10-20', startTime: '19:00', endTime: '21:00', description: 'Where: ARI Teknokent\n\nTalks and pizza' })
})

test('anything else is refused with a reason', () => {
  assert.match(error(''), /Choose an invitation file/)
  assert.match(error('hello'), /isn’t an invitation/)
  assert.match(error('BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:No time\nEND:VEVENT\nEND:VCALENDAR'), /when the event starts/)
})

// "Fri, Oct 16, 7:00 PM (GMT+03:00)" as each "Add to calendar" button encodes it.
const meetup = { title: 'ML Meetup', date: '2026-10-16', startTime: '19:00', endTime: '21:00', description: 'Where: ARI Teknokent\n\nTalks and pizza' }

test('an Outlook link fills the event, whether its times are in UTC, carry an offset or have none', () => {
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=ML%20Meetup&body=Talks%20and%20pizza&location=ARI%20Teknokent'
  assert.deepEqual(event(`${base}&startdt=2026-10-16T16:00:00Z&enddt=2026-10-16T18:00:00Z`), meetup)
  assert.deepEqual(event(`${base}&startdt=2026-10-16T19:00:00%2B03:00&enddt=2026-10-16T21:00:00%2B03:00`), meetup)
  assert.deepEqual(event(`${base}&startdt=2026-10-16T19:00:00&enddt=2026-10-16T21:00:00`), meetup)
  assert.equal(event(`${base.replace('outlook.live.com', 'outlook.office.com')}&startdt=2026-10-16&allday=true`).startTime, null)
})

test('a Yahoo link fills the event, with an end time or a duration', () => {
  const base = 'https://calendar.yahoo.com/?v=60&title=ML%20Meetup&desc=Talks%20and%20pizza&in_loc=ARI%20Teknokent&st=20261016T160000Z'
  assert.deepEqual(event(`${base}&et=20261016T180000Z`), meetup)
  assert.deepEqual(event(`${base}&dur=0200`), meetup)
})

test('an iCal button that carries the file in its link is read like the file', () => {
  const file = invite('DTSTART:20261016T160000Z', 'DTEND:20261016T180000Z')
  const result = event(`data:text/calendar;charset=utf8,${encodeURIComponent(file)}`)
  assert.deepEqual([result.title, result.date, result.startTime, result.endTime], ['Call', '2026-10-16', '19:00', '21:00'])
})

test('an iCal button that links to a file asks for the downloaded file', () => {
  assert.match(error('https://lu.ma/ics/evt-abc123.ics'), /choose it under Invitation file/)
})
