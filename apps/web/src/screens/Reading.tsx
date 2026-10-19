// Reading: books for the field as a whole. Suggestions wait under "Want to read" with who suggested
// them and why; books being read show progress and pace; library books count down to their due
// date. Lives in Growth → Reading. Course books stay in the İTÜ library.
import { useEffect, useState } from 'react'
import * as D from '../lib/dates.ts'
import { finishEstimate, loanLabel, loanState, openLoan, pagesRead, progress, readingYears, suggestedBy } from '../lib/books.ts'
import { BOOK_FORMAT_LABEL, BOOK_STATUS_LABEL, LANGUAGE_LABEL } from '../lib/labels.ts'
import { navigate } from '../lib/router.ts'
import { plural } from '../lib/rules.ts'
import type { Book, BookStatus, Language } from '../lib/types.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Banner, Empty, Menu, ProgressBar } from '../components/ui.tsx'
import type { MenuItem } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { useHop } from '../store/store.ts'
import { useBookActions } from '../store/book-actions.ts'

const STATUSES: BookStatus[] = ['reading', 'want', 'finished', 'dropped']

export function Reading({ status: initialStatus, bookId }: { status?: string; bookId?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useBookActions()
  const reading = data.books.filter((b) => b.status === 'reading')
  const [status, setStatus] = useState<BookStatus>(STATUSES.includes(initialStatus as BookStatus) ? initialStatus as BookStatus : reading.length ? 'reading' : 'want')
  const [language, setLanguage] = useState<Language | ''>('')
  const [topic, setTopic] = useState('')
  const today = D.today()

  // Links such as #/growth/reading?book=<id> open the book once, then drop the query.
  useEffect(() => {
    if (!bookId) return
    navigate('#/growth/reading')
    const book = data.books.find((b) => b.id === bookId)
    if (book) editors.bookDrawer(book)
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  if (!data.books.length) return <Empty action={() => editors.book()} actionLabel="Add a book" body="Books for your field as a whole, with who suggested them and why. Borrowed one from a library? Hop counts the days until it’s due back." title="Your reading list is empty" />

  const count = (s: BookStatus) => data.books.filter((b) => b.status === s).length
  const languages = [...new Set(data.books.map((b) => b.language).filter((l): l is Language => Boolean(l)))]
  const topics = [...new Set(data.books.flatMap((b) => b.topics))].sort()
  const matches = (b: Book) => (!language || b.language === language) && (!topic || b.topics.includes(topic))
  const list = data.books.filter((b) => b.status === status && matches(b)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const overdue = data.books.filter((b) => { const loan = openLoan(b); return loan && loanState(loan, today).overdue })
  const borrowed = data.books.filter((b) => openLoan(b)).length
  const week = pagesRead(data.books, D.startOfWeek(today, data.settings.weekStart), today)

  return (
    <>
      <p className="small muted">
        {week ? `${plural(week, 'page')} read this week. ` : 'Nothing logged this week yet. '}
        {reading.length ? `${plural(reading.length, 'book')} in progress` : 'Nothing in progress'}{borrowed ? `, ${borrowed} borrowed` : ''}.
      </p>
      {overdue.map((b) => {
        const loan = openLoan(b)!
        return (
          <Banner action={<button className="btn btn-sm" onClick={() => void actions.loans.returned(b, loan)} type="button">Returned it</button>} icon="library" key={b.id} title={`“${b.title}” is ${loanLabel(loan, today).toLowerCase()}.`} tone="danger">
            Return it to {loan.library}{loanState(loan, today).renewalsLeft !== 0 ? ', or renew it if they allow it' : ''}. Late returns can block borrowing.
          </Banner>
        )
      })}
      <div className="toolbar">
        <div aria-label="Status" className="chips" role="group">
          {STATUSES.map((s) => <button aria-pressed={status === s} className="chip" key={s} onClick={() => setStatus(s)} type="button">{BOOK_STATUS_LABEL[s]} <span className="count">{count(s)}</span></button>)}
        </div>
      </div>
      {(languages.length > 1 || topics.length > 0) && (
        <div aria-label="Filter" className="chips topic-chips" role="group">
          {languages.length > 1 && <>
            <button aria-pressed={!language} className="chip chip-sm" onClick={() => setLanguage('')} type="button">All languages</button>
            {languages.map((l) => <button aria-pressed={language === l} className="chip chip-sm" key={l} onClick={() => setLanguage(l)} type="button">{LANGUAGE_LABEL[l]}</button>)}
            {topics.length > 0 && <span aria-hidden="true" className="chip-sep" />}
          </>}
          {topics.map((t) => <button aria-pressed={topic === t} className="chip chip-sm" key={t} onClick={() => setTopic(topic === t ? '' : t)} type="button">{t}</button>)}
        </div>
      )}
      {status === 'finished'
        ? <FinishedList books={list} />
        : list.length
          ? <div className="find-list">{list.map((b) => <BookCard book={b} key={b.id} />)}</div>
          : <p className="small muted">{status === 'reading' ? 'Nothing in progress. Start one from Want to read.' : status === 'want' ? 'No suggestions waiting. When someone recommends a book, add it here with why.' : 'Nothing here.'}{language || topic ? <> <button className="link-btn" onClick={() => { setLanguage(''); setTopic('') }} type="button">Clear filters</button></> : null}</p>}
    </>
  )
}

function FinishedList({ books }: { books: Book[] }) {
  if (!books.length) return <p className="small muted">No finished books yet. They collect here by year.</p>
  return (
    <>
      {readingYears(books).map(({ year, books: list }) => (
        <section className="section" key={year}>
          <h2 className="group-label">{year} · {plural(list.length, 'book')}</h2>
          <div className="find-list">{list.map((b) => <BookCard book={b} key={b.id} />)}</div>
        </section>
      ))}
    </>
  )
}

function BookCard({ book: b }: { book: Book }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useBookActions()
  const confirm = useConfirm()
  const today = D.today()
  const loan = openLoan(b)
  const state = loan ? loanState(loan, today) : null
  const { page, pct } = progress(b)
  const finish = b.status === 'reading' ? finishEstimate(b, today) : null
  const by = suggestedBy(b, data.contacts)

  async function remove() {
    if (await confirm({ title: 'Delete this book?', body: `“${b.title}” is deleted from your reading list${b.log.length || b.loans.length ? ', with its reading log and loans' : ''}.`, confirmLabel: 'Delete', tone: 'danger' })) void actions.books.remove(b)
  }

  const borrow = <button className="btn btn-sm" onClick={() => editors.borrow(b)} type="button"><Icon className="icon-sm" name="library" />Borrowed it</button>
  const returned = loan && <button className={`btn btn-sm${b.status === 'finished' || state?.overdue ? ' btn-primary' : ''}`} onClick={() => void actions.loans.returned(b, loan)} type="button"><Icon className="icon-sm" name="check" />Returned it</button>
  const more: MenuItem[] = [
    ...(b.status === 'reading' ? [{ label: 'Finished', icon: 'award', onSelect: () => editors.finishBook(b) }] : []),
    ...(loan && state?.renewalsLeft !== 0 ? [{ label: 'Renew loan', icon: 'refresh', onSelect: () => editors.renew(b, loan) }] : []),
    { label: 'Edit', icon: 'edit', onSelect: () => editors.editBook(b) },
    ...(b.status === 'want' || b.status === 'reading' ? [{ label: 'Drop it', icon: 'x', onSelect: () => void actions.books.drop(b) }] : []),
    ...(b.status === 'finished' ? [{ label: 'Read it again', icon: 'refresh', onSelect: () => void actions.books.update(b, { status: 'reading', finishedOn: null }, 'Moved to Reading', true) }] : []),
    '-',
    { label: 'Delete', icon: 'trash', onSelect: () => void remove(), danger: true },
  ]

  return (
    <article className="find">
      <span aria-hidden="true" className="type-tile type-book"><Icon name="library" /></span>
      <div className="find-body">
        <div className="find-top"><button className="book-open" onClick={() => editors.bookDrawer(b)} type="button">{b.title}</button></div>
        {b.why && <p className="find-why">{b.why}</p>}
        {b.status === 'reading' && (
          <div className="book-progress">
            {pct !== null && <ProgressBar label={`${b.title} progress`} pct={pct} />}
            <span className="small num">{b.pages ? `p. ${page} of ${b.pages}` : page ? `p. ${page}` : 'Not started'}</span>
            {finish && <span className="xs muted">Finish around {D.short(finish)}</span>}
          </div>
        )}
        <div className="row-meta">
          {b.author && <span>{b.author}</span>}
          {b.language && <span>{LANGUAGE_LABEL[b.language]}</span>}
          {b.format !== 'paper' && <span>{BOOK_FORMAT_LABEL[b.format]}</span>}
          {by && <span><Icon name="user" />{by}</span>}
          {b.status === 'finished' && b.finishedOn && <span><Icon name="award" />Finished {D.short(b.finishedOn)}{b.rating ? `, ${b.rating}/5` : ''}</span>}
          {b.topics.map((t) => <span className="tag tag-sm" key={t}>{t}</span>)}
        </div>
        {loan && state && (
          <div className="find-outcome">
            <span className={`loan-state${state.overdue ? ' is-danger' : state.daysLeft <= 3 ? ' is-warning' : ''}`}><Icon className="icon-sm" name="library" />{loanLabel(loan, today)}, {loan.library}{state.renewalsLeft !== null ? `. ${plural(state.renewalsLeft, 'renewal')} left` : ''}</span>
          </div>
        )}
        <div className="find-actions">
          {b.status === 'want' && <><button className="btn btn-sm btn-primary" onClick={() => void actions.books.start(b)} type="button"><Icon className="icon-sm" name="play" />Start reading</button>{loan ? returned : borrow}</>}
          {b.status === 'reading' && <><button className="btn btn-sm btn-primary" onClick={() => editors.logPages(b)} type="button"><Icon className="icon-sm" name="book" />Log pages</button>{loan ? returned : borrow}</>}
          {b.status === 'finished' && returned}
          {b.status === 'dropped' && <><button className="btn btn-sm" onClick={() => void actions.books.wantAgain(b)} type="button"><Icon className="icon-sm" name="refresh" />Back to Want to read</button>{returned}</>}
          <Menu items={more} label={`More for ${b.title}`} />
        </div>
      </div>
    </article>
  )
}
