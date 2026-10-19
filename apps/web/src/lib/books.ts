// Reading: progress, pace, library loans and each book's timeline, derived from the stored log
// and loans. Nothing here is stored.
import { DEFAULT_LIBRARY, DEFAULT_LOAN_DAYS } from '@hop/domain'
import * as D from './dates.ts'
import type { Book, BookLoan, Contact } from './types.ts'

/** Pace looks back this many days, so a holiday from reading fades out of the estimate. */
export const PACE_DAYS = 14

/** Loans show up in Needs attention this many days before they are due. */
export const LOAN_NOTICE_DAYS = 3

export const openLoan = (b: Pick<Book, 'loans'>): BookLoan | undefined => b.loans.find((loan) => !loan.returnedOn)

/** The page reached on the latest day logged. */
export const lastPage = (b: Pick<Book, 'log'>) => b.log.at(-1)?.page ?? 0

export function progress(b: Pick<Book, 'log' | 'pages'>) {
  const page = lastPage(b)
  return { page, pct: b.pages ? Math.min(100, Math.round((page / b.pages) * 100)) : null }
}

/** Pages read on each logged day: the page reached minus the page reached on the day before it. */
export function pagesByDay(b: Pick<Book, 'log'>): { date: string; page: number; pages: number }[] {
  return b.log.map((entry, index) => ({ date: entry.date, page: entry.page, pages: Math.max(0, entry.page - (b.log[index - 1]?.page ?? 0)) }))
}

/** Pages read across books between two days, inclusive. */
export function pagesRead(books: Pick<Book, 'log'>[], from: string, to: string) {
  return books.reduce((total, b) => total + pagesByDay(b).filter((day) => day.date >= from && day.date <= to).reduce((sum, day) => sum + day.pages, 0), 0)
}

/**
 * Pages per day over the last two weeks, or since the book was started if that is more recent.
 * Days without reading count, so the estimate stays honest. Null before any reading.
 */
export function pace(b: Pick<Book, 'log' | 'startedOn'>, today: string): number | null {
  const first = b.log[0]?.date
  if (!first) return null
  const began = b.startedOn && b.startedOn < first ? b.startedOn : first
  const windowStart = D.addDays(today, -(PACE_DAYS - 1))
  const start = began > windowStart ? began : windowStart
  const pages = pagesByDay(b).filter((day) => day.date >= start && day.date <= today).reduce((sum, day) => sum + day.pages, 0)
  const days = D.diffDays(today, start) + 1
  return pages && days > 0 ? pages / days : null
}

/** The day the book would be finished at the current pace, if it has a page count. */
export function finishEstimate(b: Pick<Book, 'log' | 'pages' | 'startedOn'>, today: string): string | null {
  const speed = pace(b, today)
  const left = b.pages ? b.pages - lastPage(b) : 0
  if (!speed || left <= 0) return null
  return D.addDays(today, Math.ceil(left / speed))
}

export type LoanState = { daysLeft: number; overdue: boolean; renewalsLeft: number | null }

export function loanState(loan: Pick<BookLoan, 'dueOn' | 'renewedOn' | 'maxRenewals'>, today: string): LoanState {
  const daysLeft = D.diffDays(loan.dueOn, today)
  return { daysLeft, overdue: daysLeft < 0, renewalsLeft: loan.maxRenewals === null ? null : Math.max(0, loan.maxRenewals - loan.renewedOn.length) }
}

/** "Due in 5 days (Thu 29 Oct)", "Due today", "Overdue by 2 days". */
export function loanLabel(loan: Pick<BookLoan, 'dueOn'>, today: string) {
  const days = D.diffDays(loan.dueOn, today)
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`
  if (days === 0) return 'Due back today'
  if (days === 1) return 'Due back tomorrow'
  return `Due back in ${days} days (${D.withDay(loan.dueOn)})`
}

/**
 * What a new loan starts with: the library and renewal limit of the most recent loan, and its
 * loan period if it was never renewed (a renewal hides the original period).
 */
export function loanDefaults(books: Pick<Book, 'loans'>[]) {
  const loans = books.flatMap((b) => b.loans).sort((a, b) => a.borrowedOn.localeCompare(b.borrowedOn) || a.createdAt.localeCompare(b.createdAt))
  const last = loans.at(-1)
  const plain = loans.filter((loan) => !loan.renewedOn.length).at(-1)
  return {
    library: last?.library ?? DEFAULT_LIBRARY,
    maxRenewals: last?.maxRenewals ?? null,
    days: plain ? Math.max(1, D.diffDays(plain.dueOn, plain.borrowedOn)) : DEFAULT_LOAN_DAYS,
  }
}

/** The due date to suggest when renewing: one loan period from today, and always later than now. */
export function renewalDue(loan: Pick<BookLoan, 'dueOn'>, days: number, today: string) {
  const fromToday = D.addDays(today, days)
  return fromToday > loan.dueOn ? fromToday : D.addDays(loan.dueOn, days)
}

/** Who suggested the book: a person from People, or the note written instead. */
export function suggestedBy(b: Pick<Book, 'suggestedById' | 'suggestedBy'>, contacts: Pick<Contact, 'id' | 'name'>[]) {
  return contacts.find((c) => c.id === b.suggestedById)?.name ?? b.suggestedBy ?? null
}

export type TimelineEntry = { date: string; icon: string; title: string; detail?: string }

/** Everything that happened to a book, oldest first: added, borrowed, read, renewed, finished, returned. */
export function bookTimeline(b: Book, contacts: Pick<Contact, 'id' | 'name'>[] = []): TimelineEntry[] {
  const entries: (TimelineEntry & { order: number })[] = []
  const by = suggestedBy(b, contacts)
  entries.push({ date: D.ymdOf(b.createdAt), icon: 'plus', title: 'Added to your list', detail: by ? `Suggested by ${by}` : undefined, order: 0 })
  for (const loan of b.loans) {
    entries.push({ date: loan.borrowedOn, icon: 'library', title: `Borrowed from ${loan.library}`, order: 1 })
    loan.renewedOn.forEach((date, index) => entries.push({ date, icon: 'refresh', title: 'Renewed', detail: index === loan.renewedOn.length - 1 ? `Due back ${D.withDay(loan.dueOn)}` : undefined, order: 4 }))
    if (loan.returnedOn) entries.push({ date: loan.returnedOn, icon: 'check', title: `Returned to ${loan.library}`, order: 6 })
  }
  if (b.startedOn) entries.push({ date: b.startedOn, icon: 'play', title: 'Started reading', order: 2 })
  for (const day of pagesByDay(b)) {
    if (day.pages) entries.push({ date: day.date, icon: 'book', title: `Read ${day.pages} page${day.pages === 1 ? '' : 's'}`, detail: `Reached page ${day.page}${b.pages ? ` of ${b.pages}` : ''}`, order: 3 })
  }
  if (b.finishedOn) entries.push({ date: b.finishedOn, icon: 'award', title: 'Finished', detail: b.rating ? `Rated ${b.rating} of 5` : undefined, order: 5 })
  return entries.sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order).map(({ date, icon, title, detail }) => ({ date, icon, title, detail }))
}

/** Finished books by the year they were finished, newest year first. */
export function readingYears(books: Book[]): { year: string; books: Book[] }[] {
  const years = new Map<string, Book[]>()
  for (const b of books) {
    if (b.status !== 'finished') continue
    const year = (b.finishedOn ?? D.ymdOf(b.updatedAt)).slice(0, 4)
    years.set(year, [...(years.get(year) ?? []), b])
  }
  return [...years.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, list]) => ({ year, books: list.sort((x, y) => (y.finishedOn ?? '').localeCompare(x.finishedOn ?? '')) }))
}
