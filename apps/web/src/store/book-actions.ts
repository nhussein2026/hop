// Every change to the reading shelf: books, the pages logged each day, and library loans.
// Like actions.ts: cheap changes happen at once with Undo; the screens confirm deletes first.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import type { Book, BookLoan, Evidence, Find, HabitCompletion, HopData } from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

/** The create endpoints take optional fields, not nulls. */
function createBody(fields: object) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

const applyBook = (book: Book, data: HopData) => upsert(data, 'books', book)

export type BookFields = Pick<Book, 'title' | 'author' | 'pages' | 'language' | 'format' | 'why' | 'suggestedById' | 'suggestedBy' | 'topics' | 'skillIds' | 'goalId' | 'habitId'> & { status?: Book['status']; startedOn?: string | null }

export type LoanFields = { library: string; borrowedOn: string; dueOn: string; maxRenewals: number | null }

export function useBookActions() {
  const { commit } = useHop()

  return useMemo(() => {
    const path = (b: Pick<Book, 'id'>) => `/api/books/${b.id}`
    const loanPath = (b: Pick<Book, 'id'>, loan: Pick<BookLoan, 'id'>) => `${path(b)}/loans/${loan.id}`

    const books = {
      add(fields: BookFields) {
        return commit(fields.status === 'reading' ? 'Added to Reading' : 'Added to your reading list', () => api.post<Book>('/api/books', { ...createBody(fields), topics: fields.topics, skillIds: fields.skillIds }), applyBook)
      },
      update(b: Book, changes: Partial<Book>, label: string, undo = false) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, b[key as keyof Book]])) as Partial<Book>
        return commit(label, () => api.patch<Book>(path(b), changes), applyBook, {
          undo: undo ? () => void commit('Undone', () => api.patch<Book>(path(b), before), applyBook) : undefined,
        })
      },
      start(b: Book) {
        return books.update(b, { status: 'reading', startedOn: b.startedOn ?? D.today() }, 'Moved to Reading', true)
      },
      drop(b: Book) {
        return books.update(b, { status: 'dropped' }, 'Dropped. It’s under Dropped if you change your mind.', true)
      },
      wantAgain(b: Book) {
        return books.update(b, { status: 'want' }, 'Back on your reading list', true)
      },
      /** Finishing can also record the book in the history of the skills it's linked to: as Learned, since reading isn't proof. */
      finish(b: Book, fields: { finishedOn: string; rating: number | null; takeaways: string[] }, asEvidence: boolean) {
        return commit('Finished. Nice work.', async () => {
          const saved = await api.patch<Book>(path(b), { status: 'finished', ...fields, startedOn: b.startedOn ?? fields.finishedOn })
          const evidence = asEvidence
            ? await api.post<Evidence>('/api/evidence', createBody({ title: `Read “${b.title}”${b.author ? ` by ${b.author}` : ''}`, kind: 'learned', description: fields.takeaways.join('\n'), date: fields.finishedOn, skillIds: b.skillIds, goalId: b.goalId }))
            : undefined
          return { saved, evidence }
        }, ({ saved, evidence }, current) => {
          const next = applyBook(saved, current)
          return evidence ? upsert(next, 'evidence', evidence) : next
        })
      },
      remove(b: Book) {
        return commit('Book deleted', () => api.delete(path(b)), (_, current) => ({
          ...without(current, 'books', b.id),
          finds: current.finds.map((f) => (f.bookId === b.id ? { ...f, bookId: null } : f)),
        }))
      },
      /** A Radar find becomes a book on the wish list, carrying its reason, topics and language. */
      fromFind(f: Find) {
        return commit('Added to your reading list', async () => {
          const book = await api.post<Book>('/api/books', createBody({ title: f.title, why: f.why, topics: f.topics, language: f.language, suggestedBy: f.source && f.source !== 'Web' ? f.source : null }))
          const saved = await api.patch<Find>(`/api/finds/${f.id}`, { status: 'converted', bookId: book.id })
          return { book, saved }
        }, ({ book, saved }, current) => upsert(applyBook(book, current), 'finds', saved))
      },
    }

    const reading = {
      /**
       * Logging the same day again replaces that day's page. Undo puts back the page that was
       * there, the book's status, and the habit tick if this log made it.
       */
      log(b: Book, page: number, date = D.today()) {
        const previous = b.log.find((entry) => entry.date === date)
        const read = Math.max(0, page - (b.log.filter((entry) => entry.date < date).at(-1)?.page ?? 0))
        const label = b.pages && page >= b.pages ? 'Last page reached. Mark the book finished when you’re ready.' : read ? `${read} page${read === 1 ? '' : 's'} logged. On page ${page}.` : `On page ${page}.`
        let ticked: HabitCompletion | null = null
        // `tick` is the linked habit's completion for the day after the log: new, or with more pages.
        const withTick = (completions: HabitCompletion[], tick: HabitCompletion | null) => (tick ? [...completions.filter((c) => c.id !== tick.id), tick] : completions)
        return commit(label, async () => {
          const result = await api.post<{ book: Book; completion: HabitCompletion | null; tick: HabitCompletion | null }>(`${path(b)}/log`, { date, page })
          ticked = result.completion
          return result
        }, ({ book, tick }, current) => ({
          ...applyBook(book, current),
          completions: withTick(current.completions, tick),
        }), {
          undo: () => void commit('Undone', async () => {
            const again = previous ? await api.post<{ book: Book; tick: HabitCompletion | null }>(`${path(b)}/log`, { date, page: previous.page }) : null
            let restored = again ? again.book : await api.delete<Book>(`${path(b)}/log/${date}`)
            if (restored.status !== b.status || restored.startedOn !== b.startedOn) restored = await api.patch<Book>(path(b), { status: b.status, startedOn: b.startedOn })
            if (ticked) await api.delete(`/api/habits/${ticked.habitId}/completions/${date}`)
            return { restored, ticked, tick: ticked ? null : again?.tick ?? null }
          }, ({ restored, ticked: undone, tick }, current) => ({
            ...applyBook(restored, current),
            completions: withTick(undone ? current.completions.filter((c) => c.id !== undone.id) : current.completions, tick),
          })),
        })
      },
    }

    const loans = {
      borrow(b: Book, fields: LoanFields) {
        return commit(`Borrowed. Due back ${D.withDay(fields.dueOn)}.`, () => api.post<Book>(`${path(b)}/loans`, { ...fields, library: fields.library || undefined }), applyBook)
      },
      update(b: Book, loan: BookLoan, changes: Partial<BookLoan>, label: string) {
        return commit(label, () => api.patch<Book>(loanPath(b, loan), changes), applyBook)
      },
      renew(b: Book, loan: BookLoan, dueOn: string) {
        return commit(`Renewed. Due back ${D.withDay(dueOn)}.`, () => api.post<Book>(`${loanPath(b, loan)}/renew`, { date: D.today(), dueOn }), applyBook, {
          undo: () => void commit('Renewal undone', () => api.patch<Book>(loanPath(b, loan), { dueOn: loan.dueOn, renewedOn: loan.renewedOn }), applyBook),
        })
      },
      returned(b: Book, loan: BookLoan, date = D.today()) {
        return commit(`Returned to ${loan.library}`, () => api.patch<Book>(loanPath(b, loan), { returnedOn: date }), applyBook, {
          undo: () => void commit('Undone', () => api.patch<Book>(loanPath(b, loan), { returnedOn: null }), applyBook),
        })
      },
      remove(b: Book, loan: BookLoan) {
        return commit('Loan removed', () => api.delete<Book>(loanPath(b, loan)), applyBook)
      },
    }

    return { books, reading, loans }
  }, [commit])
}
