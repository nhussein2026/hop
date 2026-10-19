import assert from 'node:assert/strict'
import test from 'node:test'
import { bookTimeline, finishEstimate, loanDefaults, loanLabel, loanState, openLoan, pace, pagesByDay, pagesRead, progress, readingYears, renewalDue, suggestedBy } from './books.ts'
import { setTimezone } from './dates.ts'
import type { Book, BookLoan } from './types.ts'

setTimezone('UTC')

const stamp = '2026-10-01T09:00:00.000Z'

const book = (fields: Partial<Book> = {}): Book => ({
  id: 'b', title: 'Book', author: null, pages: null, language: 'tr', format: 'paper', status: 'reading', why: '', suggestedById: null, suggestedBy: null,
  topics: [], skillIds: [], goalId: null, habitId: null, startedOn: null, finishedOn: null, rating: null, takeaways: [], createdAt: stamp, updatedAt: stamp,
  loans: [], log: [], ...fields,
})

const log = (...days: [string, number][]) => days.map(([date, page], index) => ({ id: `e${index}`, bookId: 'b', date, page, createdAt: stamp }))

const loan = (fields: Partial<BookLoan> = {}): BookLoan => ({
  id: 'l', bookId: 'b', library: 'İTÜ Library', borrowedOn: '2026-10-01', dueOn: '2026-10-15', renewedOn: [], maxRenewals: null, returnedOn: null,
  createdAt: stamp, updatedAt: stamp, ...fields,
})

test('progress follows the latest page and pages per day are the difference', () => {
  const b = book({ pages: 200, log: log(['2026-10-10', 30], ['2026-10-11', 50], ['2026-10-13', 45]) })

  assert.deepEqual(progress(b), { page: 45, pct: 23 })
  assert.deepEqual(progress(book()), { page: 0, pct: null })
  // Going back a few pages to reread never counts as negative reading.
  assert.deepEqual(pagesByDay(b).map((day) => day.pages), [30, 20, 0])
  assert.equal(pagesRead([b, book({ log: log(['2026-10-11', 12]) })], '2026-10-11', '2026-10-13'), 32)
})

test('pace counts days without reading, and the estimate follows it', () => {
  // 60 pages over the 6 days since starting: 10 a day, 140 pages left.
  const b = book({ pages: 200, startedOn: '2026-10-13', log: log(['2026-10-13', 20], ['2026-10-15', 60]) })

  assert.equal(pace(b, '2026-10-18'), 10)
  assert.equal(finishEstimate(b, '2026-10-18'), '2026-11-01')
  assert.equal(pace(book(), '2026-10-18'), null)
  assert.equal(finishEstimate(book({ log: log(['2026-10-13', 20]) }), '2026-10-18'), null)
})

test('pace only looks back two weeks', () => {
  const b = book({ startedOn: '2026-09-01', log: log(['2026-09-02', 280], ['2026-10-18', 308]) })

  assert.equal(pace(b, '2026-10-18'), 2)
})

test('a loan counts down to its due date and its renewals', () => {
  const l = loan({ dueOn: '2026-10-20', maxRenewals: 3, renewedOn: ['2026-10-06'] })

  assert.deepEqual(loanState(l, '2026-10-18'), { daysLeft: 2, overdue: false, renewalsLeft: 2 })
  assert.equal(loanState(l, '2026-10-22').overdue, true)
  assert.equal(loanState(loan(), '2026-10-01').renewalsLeft, null)
  assert.equal(loanLabel(l, '2026-10-12'), 'Due back in 8 days (Tue 20 Oct)')
  assert.equal(loanLabel(l, '2026-10-19'), 'Due back tomorrow')
  assert.equal(loanLabel(l, '2026-10-23'), 'Overdue by 3 days')
  assert.equal(openLoan(book({ loans: [loan({ returnedOn: '2026-10-05' }), l] })), l)
})

test('a new loan starts from the last one, and renewing always moves the date later', () => {
  assert.deepEqual(loanDefaults([]), { library: 'İTÜ Library', maxRenewals: null, days: 14 })

  const books = [book({ loans: [loan({ library: 'Mustafa İnan', borrowedOn: '2026-09-01', dueOn: '2026-09-16', maxRenewals: 3 })] }), book({ loans: [loan({ library: 'Gümüşsuyu', borrowedOn: '2026-10-01', dueOn: '2026-11-01', renewedOn: ['2026-10-15'] })] })]
  assert.deepEqual(loanDefaults(books), { library: 'Gümüşsuyu', maxRenewals: null, days: 15 })

  assert.equal(renewalDue(loan({ dueOn: '2026-10-20' }), 14, '2026-10-18'), '2026-11-01')
  // Renewing far ahead of time still pushes the date out.
  assert.equal(renewalDue(loan({ dueOn: '2026-11-10' }), 14, '2026-10-18'), '2026-11-24')
})

test('the timeline tells the book’s story in order', () => {
  const b = book({
    pages: 300, suggestedById: 'c1', startedOn: '2026-10-02', finishedOn: '2026-10-20', rating: 4, status: 'finished',
    loans: [loan({ borrowedOn: '2026-10-02', dueOn: '2026-10-30', renewedOn: ['2026-10-15'], returnedOn: '2026-10-21' })],
    log: log(['2026-10-02', 40], ['2026-10-03', 40], ['2026-10-20', 300]),
  })

  assert.deepEqual(bookTimeline(b, [{ id: 'c1', name: 'Ayşe Hoca' }]).map((entry) => `${entry.date} ${entry.title}`), [
    '2026-10-01 Added to your list',
    '2026-10-02 Borrowed from İTÜ Library',
    '2026-10-02 Started reading',
    '2026-10-02 Read 40 pages',
    '2026-10-15 Renewed',
    '2026-10-20 Read 260 pages',
    '2026-10-20 Finished',
    '2026-10-21 Returned to İTÜ Library',
  ])
  assert.equal(bookTimeline(b, [{ id: 'c1', name: 'Ayşe Hoca' }])[0]!.detail, 'Suggested by Ayşe Hoca')
  assert.equal(suggestedBy(book({ suggestedBy: 'BLG 513 syllabus' }), []), 'BLG 513 syllabus')
})

test('finished books are grouped by year, newest first', () => {
  const years = readingYears([
    book({ id: 'a', status: 'finished', finishedOn: '2025-12-30' }),
    book({ id: 'b', status: 'finished', finishedOn: '2026-03-01' }),
    book({ id: 'c', status: 'finished', finishedOn: '2026-09-01' }),
    book({ id: 'd', status: 'reading' }),
  ])

  assert.deepEqual(years.map((y) => [y.year, y.books.map((b) => b.id)]), [['2026', ['c', 'b']], ['2025', ['a']]])
})
