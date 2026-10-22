// Reading dialogs: add or edit a book, log the page you reached, borrow, renew and finish, and the
// book drawer with its timeline.
import { useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { MAX_TAKEAWAYS } from '@hop/domain'
import * as D from '../lib/dates.ts'
import { bookTimeline, finishEstimate, lastPage, loanDefaults, loanLabel, loanState, openLoan, pace, pagesByDay, progress, renewalDue, suggestedBy } from '../lib/books.ts'
import { BOOK_FORMAT_LABEL, BOOK_STATUS_LABEL, LANGUAGE_LABEL, LANGUAGE_OPTIONS } from '../lib/labels.ts'
import { plural } from '../lib/rules.ts'
import { splitList } from '../lib/uni.ts'
import type { Book, BookFormat, BookLoan, Language } from '../lib/types.ts'
import { useBookActions } from '../store/book-actions.ts'
import { useHop } from '../store/store.ts'
import { Icon } from '../components/Icon.tsx'
import { Badge, Dialog, Field, Menu, ProgressBar, Segmented, SubmitButton } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { closeDialog, focusFirstInvalid, formText, useDialogs } from '../components/ui-context.ts'

type Errors = Record<string, string>

const FORMAT_OPTIONS = Object.entries(BOOK_FORMAT_LABEL) as [BookFormat, string][]

/** A whole number from a form field, or null when it's empty. NaN when it isn't a number. */
function formNumber(form: HTMLFormElement, name: string) {
  const value = formText(form, name)
  return value ? Number(value) : null
}

/* ---- Add or edit a book ------------------------------------------------------------------ */
export function BookEditor({ book, defaults = {}, close }: { book?: Book | null; defaults?: Partial<Book>; close: () => void }) {
  const { data } = useHop()
  const actions = useBookActions()
  const [errors, setErrors] = useState<Errors>({})
  const base = { ...defaults, ...book }
  const topics = [...new Set([...data.books.flatMap((b) => b.topics), ...data.finds.flatMap((f) => f.topics)])].sort()
  // New books start in the language of the last book added; Turkish before there is one.
  const lastLanguage = [...data.books].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.language
  const contactName = data.contacts.find((c) => c.id === base.suggestedById)?.name
  const linked = Boolean(base.skillIds?.length || base.goalId || base.habitId)

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const pages = formNumber(form, 'pages')
    const next: Errors = {}
    if (!title) next.title = 'Add the title.'
    if (pages !== null && (!Number.isInteger(pages) || pages < 1 || pages > 20000)) next.pages = 'Use a whole number of pages, like 320.'
    const lowest = book ? lastPage(book) : 0
    if (pages !== null && !next.pages && pages < lowest) next.pages = `You’ve logged page ${lowest} already.`
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)

    // A name from People links the person; anything else is kept as written.
    const by = formText(form, 'suggestedBy')
    const person = by ? data.contacts.find((c) => c.name.toLowerCase() === by.toLowerCase()) : undefined
    const fields = {
      title,
      author: formText(form, 'author') || null,
      pages,
      language: (String(fd.get('language') || '') || null) as Language | null,
      format: String(fd.get('format') || 'paper') as BookFormat,
      why: formText(form, 'why'),
      suggestedById: person?.id ?? null,
      suggestedBy: person ? null : by || null,
      topics: [...new Set([...fd.getAll('topics').map(String), ...splitList(formText(form, 'newTopics'))])],
      skillIds: fd.getAll('skills').map(String),
      goalId: String(fd.get('goalId') || '') || null,
      habitId: String(fd.get('habitId') || '') || null,
    }

    if (book) {
      if (await actions.books.update(book, fields, 'Book updated')) closeDialog(form)
      return
    }
    const reading = fd.get('status') === 'reading'
    if (await actions.books.add({ ...fields, status: reading ? 'reading' : 'want', startedOn: reading ? D.today() : null })) closeDialog(form)
  }

  return (
    <Dialog
      desc={book ? undefined : 'A book for your field as a whole. Course books go in the İTÜ library.'}
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{book ? 'Save' : 'Add book'}</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title={book ? 'Edit book' : 'Add a book'}
    >
      <div className="form-grid">
        <Field defaultValue={base.title} error={errors.title} label="Title" name="title" required />
        <Field defaultValue={base.author} label="Author" name="author" optional />
        <div className="form-row">
          <Field defaultValue={base.language ?? lastLanguage ?? 'tr'} label="Language" name="language" options={LANGUAGE_OPTIONS} type="select" />
          <Field defaultValue={base.format ?? 'paper'} label="Format" name="format" options={FORMAT_OPTIONS} type="select" />
          <Field defaultValue={base.pages} error={errors.pages} label="Pages" max={20000} min={1} name="pages" optional type="number" />
        </div>
        {!book && <Segmented defaultValue={base.status === 'reading' ? 'reading' : 'want'} label="Where does it go?" name="status" options={[['want', 'Want to read'], ['reading', 'Reading now']]} />}
        <Field defaultValue={base.why} hint="What made you want to read it. This is what keeps a suggestion useful later." label="Why it matters" name="why" optional placeholder="One line. e.g. “Explains how databases really work, before BLG 5xx.”" rows={2} type="textarea" />
        <div className="field">
          <label htmlFor="bk-by">Suggested by <span className="optional">(optional)</span></label>
          <input aria-describedby="bk-by-hint" className="input" defaultValue={contactName ?? base.suggestedBy ?? ''} id="bk-by" list="bk-people" name="suggestedBy" placeholder="A person, a syllabus, a talk…" />
          <datalist id="bk-people">{data.contacts.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          <span className="field-hint" id="bk-by-hint">Pick someone from People to link them, or write anything else.</span>
        </div>
        <fieldset className="field">
          <legend className="field-label">Topics</legend>
          {topics.length > 0 && <div className="check-chips">{topics.map((topic) => <label className="check-chip" key={topic}><input defaultChecked={base.topics?.includes(topic)} name="topics" type="checkbox" value={topic} /><span>{topic}</span></label>)}</div>}
          <label className="visually-hidden" htmlFor="bk-newtopics">New topics</label>
          <input className="input" id="bk-newtopics" name="newTopics" placeholder="New topics, comma separated" style={{ marginTop: 6 }} />
        </fieldset>
        <details className="disclosure" open={linked || undefined}>
          <summary>Link to a skill, goal or habit</summary>
          <div className="form-grid" style={{ marginTop: 'var(--s-3)' }}>
            {data.skills.length > 0 && (
              <fieldset className="field">
                <legend className="field-label">Skills it builds</legend>
                <div className="check-chips">{data.skills.map((k) => <label className="check-chip" key={k.id}><input defaultChecked={base.skillIds?.includes(k.id)} name="skills" type="checkbox" value={k.id} /><span>{k.name}</span></label>)}</div>
              </fieldset>
            )}
            <Field defaultValue={base.goalId ?? ''} label="Goal" name="goalId" options={[['', 'None'], ...data.goals.filter((g) => g.status === 'active' || g.id === base.goalId).map((g): [string, string] => [g.id, g.name])]} type="select" />
            <Field defaultValue={base.habitId ?? ''} hint="Logging pages ticks this habit for the day." label="Habit" name="habitId" options={[['', 'None'], ...data.habits.filter((h) => h.active || h.id === base.habitId).map((h): [string, string] => [h.id, h.name])]} type="select" />
          </div>
        </details>
      </div>
    </Dialog>
  )
}

/* ---- Log the page reached ------------------------------------------------------------------ */
export function LogPages({ book, close }: { book: Book; close: () => void }) {
  const { data } = useHop()
  const actions = useBookActions()
  const { open } = useDialogs()
  const [error, setError] = useState('')
  const current = data.books.find((b) => b.id === book.id) ?? book
  const last = current.log.at(-1)

  async function submit(form: HTMLFormElement) {
    const page = formNumber(form, 'page')
    const date = formText(form, 'date') || D.today()
    const message = page === null || !Number.isInteger(page) || page < 0
      ? 'Write the page number you reached, like 142.'
      : current.pages && page > current.pages ? `This book has ${current.pages} pages.` : date > D.today() ? 'That day hasn’t happened yet.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    const saved = await actions.reading.log(current, page!, date)
    if (!saved) return
    closeDialog(form)
    if (current.pages && page! >= current.pages && current.status !== 'finished') open((closeNext) => <FinishBook book={saved.book} close={closeNext} />)
  }

  return (
    <Dialog desc={current.title} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Log</SubmitButton></>} onClose={close} onSubmit={submit} title="Log pages">
      <div className="form-grid">
        <Field
          defaultValue={last?.page ?? ''}
          error={error}
          hint={last ? `Last time: page ${last.page}, ${D.relative(last.date).toLowerCase()}.` : 'The page you’re on now. Hop works out how much you read.'}
          label={current.pages ? `Page you reached (of ${current.pages})` : 'Page you reached'}
          max={current.pages ?? 20000}
          min={0}
          name="page"
          required
          type="number"
        />
        <Field defaultValue={D.today()} hint="Change it to log a day you missed." label="Day" name="date" type="date" />
      </div>
    </Dialog>
  )
}

/* ---- Borrow, or edit a loan ---------------------------------------------------------------- */
export function LoanEditor({ book, loan, close }: { book: Book; loan?: BookLoan | null; close: () => void }) {
  const { data } = useHop()
  const actions = useBookActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const defaults = loanDefaults(data.books)
  const today = D.today()
  const [dueTouched, setDueTouched] = useState(Boolean(loan))

  async function submit(form: HTMLFormElement) {
    const borrowedOn = formText(form, 'borrowedOn')
    const dueOn = formText(form, 'dueOn')
    const returnedOn = formText(form, 'returnedOn') || null
    const renewals = formNumber(form, 'maxRenewals')
    const next: Errors = {}
    if (!formText(form, 'library')) next.library = 'Name the library.'
    if (!borrowedOn) next.borrowedOn = 'Add the day you borrowed it.'
    if (!dueOn) next.dueOn = 'Add the due date from the library.'
    else if (borrowedOn && dueOn < borrowedOn) next.dueOn = 'The due date is before the day you borrowed it.'
    if (renewals !== null && (!Number.isInteger(renewals) || renewals < 0 || renewals > 20)) next.maxRenewals = 'Use a whole number, like 3.'
    if (returnedOn && borrowedOn && returnedOn < borrowedOn) next.returnedOn = 'It can’t be returned before it was borrowed.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { library: formText(form, 'library'), borrowedOn, dueOn, maxRenewals: renewals }
    const saved = loan
      ? await actions.loans.update(book, loan, { ...fields, returnedOn }, 'Loan updated')
      : await actions.loans.borrow(book, fields)
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!loan || !await confirm({ title: 'Remove this loan?', body: `The loan from ${loan.library} on ${D.short(loan.borrowedOn)} is removed from the book’s history. The book stays.`, confirmLabel: 'Remove', tone: 'danger' })) return
    if (await actions.loans.remove(book, loan)) closeDialog(form)
  }

  return (
    <Dialog
      desc={book.title}
      foot={<>
        {loan && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">Remove loan</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{loan ? 'Save' : 'Borrowed'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={loan ? 'Edit loan' : 'Borrowed from a library'}
    >
      <div className="form-grid">
        <Field defaultValue={loan?.library ?? defaults.library} error={errors.library} label="Library" name="library" required />
        <div className="form-row">
          <div className="field">
            <label htmlFor="ln-borrowed">Borrowed on</label>
            <input
              aria-invalid={errors.borrowedOn ? true : undefined}
              className="input"
              defaultValue={loan?.borrowedOn ?? today}
              id="ln-borrowed"
              name="borrowedOn"
              onChange={(event) => {
                // Until the due date is set by hand, it follows the borrowing day.
                const due = event.currentTarget.form!.elements.namedItem('dueOn') as HTMLInputElement
                if (!dueTouched && event.currentTarget.value) due.value = D.addDays(event.currentTarget.value, defaults.days)
              }}
              type="date"
            />
            {errors.borrowedOn && <span className="field-error"><Icon className="icon-sm" name="alertCircle" />{errors.borrowedOn}</span>}
          </div>
          <div className="field">
            <label htmlFor="ln-due">Due back</label>
            <input aria-describedby="ln-due-hint" aria-invalid={errors.dueOn ? true : undefined} className="input" defaultValue={loan?.dueOn ?? D.addDays(today, defaults.days)} id="ln-due" name="dueOn" onChange={() => setDueTouched(true)} type="date" />
            <span className="field-hint" id="ln-due-hint">{loan ? 'As the library shows it.' : `${defaults.days} days from borrowing. Check it against the library’s slip.`}</span>
            {errors.dueOn && <span className="field-error"><Icon className="icon-sm" name="alertCircle" />{errors.dueOn}</span>}
          </div>
        </div>
        <Field defaultValue={loan ? loan.maxRenewals : defaults.maxRenewals} error={errors.maxRenewals} hint="Leave it empty if you don’t know. Hop then won’t count them." label="Renewals allowed" max={20} min={0} name="maxRenewals" optional type="number" />
        {loan && <Field defaultValue={loan.returnedOn} error={errors.returnedOn} label="Returned on" name="returnedOn" optional type="date" />}
      </div>
    </Dialog>
  )
}

/* ---- Renew ------------------------------------------------------------------------------- */
export function RenewLoan({ book, loan, close }: { book: Book; loan: BookLoan; close: () => void }) {
  const { data } = useHop()
  const actions = useBookActions()
  const [error, setError] = useState('')
  const today = D.today()
  const state = loanState(loan, today)
  const days = loanDefaults(data.books).days

  async function submit(form: HTMLFormElement) {
    const dueOn = formText(form, 'dueOn')
    const message = !dueOn ? 'Add the new due date.' : dueOn <= loan.dueOn ? `Pick a day after the current due date (${D.withDay(loan.dueOn)}).` : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    if (await actions.loans.renew(book, loan, dueOn)) closeDialog(form)
  }

  const used = state.renewalsLeft === null ? `${plural(loan.renewedOn.length, 'renewal')} so far.` : `${loan.renewedOn.length} of ${loan.maxRenewals} renewals used.`
  return (
    <Dialog desc={`${book.title}. ${loan.library}. ${used}`} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Renew</SubmitButton></>} onClose={close} onSubmit={submit} title="Renew the loan">
      <div className="form-grid">
        <p className="small muted">Renew it with the library first (online or at the desk), then write the new date here.</p>
        <Field defaultValue={renewalDue(loan, days, today)} error={error} hint="Use the date the library gives you after renewing." label="New due date" name="dueOn" type="date" />
      </div>
    </Dialog>
  )
}

/* ---- Finish ------------------------------------------------------------------------------ */
export function FinishBook({ book, close }: { book: Book; close: () => void }) {
  const { data } = useHop()
  const actions = useBookActions()
  const current = data.books.find((b) => b.id === book.id) ?? book
  const loan = openLoan(current)
  const skills = data.skills.filter((k) => current.skillIds.includes(k.id))
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const finishedOn = formText(form, 'finishedOn') || D.today()
    const message = current.startedOn && finishedOn < current.startedOn ? `You started it on ${D.short(current.startedOn)}.` : finishedOn > D.today() ? 'That day hasn’t happened yet.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    const rating = fd.get('rating') ? Number(fd.get('rating')) : null
    const takeaways = Array.from({ length: MAX_TAKEAWAYS }, (_, index) => formText(form, `takeaway${index}`)).filter(Boolean)
    if (await actions.books.finish(current, { finishedOn, rating, takeaways }, fd.get('evidence') === 'on')) closeDialog(form)
  }

  return (
    <Dialog desc={current.title} foot={<><button className="btn" data-close type="button">Not yet</button><SubmitButton>Mark finished</SubmitButton></>} onClose={close} onSubmit={submit} title="Finished the book?">
      <div className="form-grid">
        {loan && <p className="small"><Icon className="icon-sm" name="library" /> Remember to return it to {loan.library}: {loanLabel(loan, D.today()).toLowerCase()}.</p>}
        <Field defaultValue={D.today()} error={error} label="Finished on" name="finishedOn" type="date" />
        <Segmented label="How useful was it?" name="rating" options={[['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']]} />
        <fieldset className="field">
          <legend className="field-label">What will you remember? <span className="optional">(optional)</span></legend>
          <div className="form-grid">
            {Array.from({ length: MAX_TAKEAWAYS }, (_, index) => (
              <span key={index}>
                <label className="visually-hidden" htmlFor={`fb-take${index}`}>Takeaway {index + 1}</label>
                <input className="input" defaultValue={current.takeaways[index] ?? ''} id={`fb-take${index}`} maxLength={500} name={`takeaway${index}`} placeholder={index === 0 ? 'One line each. e.g. “Indexes trade write speed for read speed.”' : ''} />
              </span>
            ))}
          </div>
        </fieldset>
        <label className="check-line"><input defaultChecked={skills.length > 0} name="evidence" type="checkbox" /> Add it to Evidence{skills.length ? ` for ${skills.map((k) => k.name).join(', ')}` : ''} as Learned</label>
        <p className="xs muted">Learned stays in a skill’s history but never raises its level: reading is learning, not proof.</p>
      </div>
    </Dialog>
  )
}

/* ---- The book drawer ----------------------------------------------------------------------- */
export function BookDrawer({ book, close }: { book: Book; close: () => void }) {
  const { data } = useHop()
  const actions = useBookActions()
  const confirm = useConfirm()
  const { open } = useDialogs()
  const current = data.books.find((b) => b.id === book.id) ?? book
  const today = D.today()
  const { page, pct } = progress(current)
  const speed = pace(current, today)
  const finish = current.status === 'reading' ? finishEstimate(current, today) : null
  const loan = openLoan(current)
  const by = suggestedBy(current, data.contacts)
  const skills = data.skills.filter((k) => current.skillIds.includes(k.id))
  const goal = data.goals.find((g) => g.id === current.goalId)
  const habit = data.habits.find((h) => h.id === current.habitId)
  const recent = pagesByDay(current).slice(-7).reverse()
  const body = useRef<HTMLDivElement>(null)
  /** Close the drawer, then open the next dialog. */
  const then = (next: (closeNext: () => void) => ReactNode) => (event: MouseEvent<HTMLButtonElement>) => { closeDialog(event.currentTarget.form!); open(next) }

  async function remove() {
    const extra = current.log.length || current.loans.length ? ` Its reading log and ${plural(current.loans.length, 'loan')} go with it.` : ''
    if (!await confirm({ title: 'Delete this book?', body: `“${current.title}” is deleted from your reading list.${extra}`, confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.books.remove(current)) body.current?.closest('dialog')?.close()
  }

  const subtitle = [current.author, current.language ? LANGUAGE_LABEL[current.language] : null, BOOK_FORMAT_LABEL[current.format], current.pages ? `${current.pages} pages` : null].filter(Boolean).join(' · ')
  return (
    <Dialog className="drawer" desc={subtitle} foot={false} onClose={close} title={current.title}>
      <div className="stack" ref={body}>
        <div className="find-actions">
          {current.status === 'want' && <button className="btn btn-primary" onClick={() => void actions.books.start(current)} type="button"><Icon className="icon-sm" name="play" />Start reading</button>}
          {current.status === 'reading' && <button className="btn btn-primary" onClick={then((c) => <LogPages book={current} close={c} />)} type="button"><Icon className="icon-sm" name="book" />Log pages</button>}
          {current.status === 'reading' && <button className="btn" onClick={then((c) => <FinishBook book={current} close={c} />)} type="button"><Icon className="icon-sm" name="award" />Finished</button>}
          {current.status === 'dropped' && <button className="btn" onClick={() => void actions.books.wantAgain(current)} type="button"><Icon className="icon-sm" name="refresh" />Back to Want to read</button>}
          {!loan && current.status !== 'finished' && current.status !== 'dropped' && <button className="btn" onClick={then((c) => <LoanEditor book={current} close={c} />)} type="button"><Icon className="icon-sm" name="library" />Borrowed it</button>}
          <span className="spacer" />
          <Menu items={[
            { label: 'Edit', icon: 'edit', onSelect: () => open((c) => <BookEditor book={current} close={c} />) },
            ...(current.status === 'reading' || current.status === 'want' ? [{ label: 'Drop it', icon: 'x', onSelect: () => void actions.books.drop(current) }] : []),
            ...(current.status === 'finished' ? [{ label: 'Read it again', icon: 'refresh', onSelect: () => void actions.books.update(current, { status: 'reading', finishedOn: null }, 'Moved to Reading', true) }] : []),
            '-',
            { label: 'Delete', icon: 'trash', onSelect: () => void remove(), danger: true },
          ]} label={`More for ${current.title}`} />
        </div>

        {(current.status === 'reading' || page > 0) && (
          <section className="section">
            <div className="section-head"><h3>Progress</h3><Badge tone={current.status === 'finished' ? 'success' : current.status === 'reading' ? 'primary' : ''}>{BOOK_STATUS_LABEL[current.status]}</Badge></div>
            {pct !== null && <ProgressBar label={`${current.title} progress`} pct={pct} />}
            <p className="small">
              {current.pages ? `Page ${page} of ${current.pages} (${pct}%).` : page ? `On page ${page}.` : 'Nothing logged yet.'}
              {speed ? ` About ${Math.max(1, Math.round(speed))} pages a day lately.` : ''}
              {finish ? ` At this pace you finish around ${D.withDay(finish)}.` : ''}
            </p>
            {recent.length > 0 && (
              <ul className="evidence-mini">
                {recent.map((day) => <li key={day.date}><span>{D.relative(day.date, today)}</span><span className="xs muted num">{day.pages ? `+${day.pages} pages, ` : ''}page {day.page}</span></li>)}
              </ul>
            )}
          </section>
        )}

        <section className="section">
          <div className="section-head"><h3>Library</h3></div>
          {loan
            ? (() => {
                const state = loanState(loan, today)
                return (
                  <>
                    <p className={`small loan-state${state.overdue ? ' is-danger' : state.daysLeft <= 3 ? ' is-warning' : ''}`}><strong>{loanLabel(loan, today)}</strong></p>
                    <p className="small muted">Borrowed from {loan.library} on {D.withDay(loan.borrowedOn)}.{state.renewalsLeft !== null ? ` ${loan.renewedOn.length} of ${loan.maxRenewals} renewals used.` : loan.renewedOn.length ? ` Renewed ${plural(loan.renewedOn.length, 'time')}.` : ''}</p>
                    <div className="find-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => void actions.loans.returned(current, loan)} type="button"><Icon className="icon-sm" name="check" />Returned it</button>
                      <button className="btn btn-sm" disabled={state.renewalsLeft === 0} onClick={then((c) => <RenewLoan book={current} close={c} loan={loan} />)} type="button"><Icon className="icon-sm" name="refresh" />{state.renewalsLeft === 0 ? 'No renewals left' : 'Renew'}</button>
                      <button className="btn btn-sm btn-ghost" onClick={then((c) => <LoanEditor book={current} close={c} loan={loan} />)} type="button">Edit loan</button>
                    </div>
                  </>
                )
              })()
            : <p className="small muted">{current.loans.length ? `Not borrowed now. Borrowed ${plural(current.loans.length, 'time')} before.` : 'Not borrowed. If you take it from a library, Hop counts the days until it’s due back.'}</p>}
        </section>

        <dl className="facts">
          <div><dt>Why</dt><dd>{current.why || <span className="muted">Not written yet</span>}</dd></div>
          {by && <div><dt>Suggested by</dt><dd>{current.suggestedById ? <a data-close href={`#/career/people?contact=${current.suggestedById}`}>{by}</a> : by}</dd></div>}
          {goal && <div><dt>Goal</dt><dd><a data-close href={`#/goals/${goal.id}`}>{goal.name}</a></dd></div>}
          {habit && <div><dt>Habit</dt><dd>{habit.name}</dd></div>}
        </dl>
        {(skills.length > 0 || current.topics.length > 0) && (
          <div className="tag-list">
            {skills.map((k) => <a className="tag" data-close href={`#/growth/skills?skill=${k.id}`} key={k.id}>{k.name}</a>)}
            {current.topics.map((t) => <span className="tag tag-sm" key={t}>{t}</span>)}
          </div>
        )}

        {current.takeaways.length > 0 && (
          <section className="section">
            <div className="section-head"><h3>Takeaways</h3>{current.rating && <span className="small muted">Rated {current.rating} of 5</span>}</div>
            <ul className="link-list">{current.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        )}

        <section className="section">
          <div className="section-head"><h3>Timeline</h3></div>
          <ol className="timeline">
            {bookTimeline(current, data.contacts).reverse().map((entry, index) => (
              <li className="tl-item" key={`${entry.date}-${index}`}>
                <span aria-hidden="true" className="tl-dot tl-icon"><Icon className="icon-sm" name={entry.icon} /></span>
                <div className="tl-body"><span className="tl-title">{entry.title}</span><span className="xs muted">{D.withDay(entry.date)}{entry.detail ? `. ${entry.detail}` : ''}</span></div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Dialog>
  )
}
