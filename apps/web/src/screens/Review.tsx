// Review: weekly and monthly reviews and daily reflections. Hop fills in the facts; you write the judgement.
// The weekly output is next week's top 3, which become real tasks. The monthly output is next month's focus.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { monthEnd, monthFacts, plural, reviewMonth, weekFacts } from '../lib/rules.ts'
import { staleFinds, upcoming } from '../lib/uni.ts'
import type { Route } from '../lib/router.ts'
import type { MonthFacts, MonthlyReview, WeekFacts, WeeklyReview } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Banner, Empty, Field, FieldError, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { celebrate } from '../lib/notifications.ts'

export function Review({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const tab = route.params[0] || 'week'
  const pastCount = data.weeklyReviews.filter((w) => w.status === 'completed').length + data.monthlyReviews.filter((m) => m.status === 'completed').length
  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Review</h1><p>What worked, what didn’t, and what changes next.</p></div>
        <div className="page-head-actions"><button className="btn" onClick={() => editors.reflection()} type="button"><Icon className="icon-sm" name="edit" />Today’s reflection</button></div>
      </header>
      <Tabs active={tab} items={[['week', 'This week', '#/review'], ['month', 'This month', '#/review/month'], ['reflections', 'Reflections', '#/review/reflections', data.reflections.length], ['history', 'Past reviews', '#/review/history', pastCount]]} label="Review sections" />
      {tab === 'reflections' ? <Reflections /> : tab === 'history' ? <History /> : tab === 'month' ? <ThisMonth /> : <ThisWeek />}
    </div>
  )
}

function FactTile({ label, value }: { label: string; value: string | number }) {
  return <div className="metric metric-sm"><span className="metric-label">{label}</span><span className="metric-value num">{value}</span></div>
}

const PLACEHOLDERS = ['e.g. Ace the Trendyol interview', 'e.g. Submit the Hepsiburada take-home', 'e.g. Ship nightly backups']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Reviews saved before the top 3 existed kept next week's plan as free text. */
const topThreeOf = (review: WeeklyReview) => review.topThree.filter(Boolean).length ? review.topThree.filter(Boolean) : review.nextWeek ? [review.nextWeek] : []

function ThisWeek() {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string>()
  const today = D.today()
  const weekStart = D.startOfWeek(today, data.settings.weekStart)
  const weekEnd = D.addDays(weekStart, 6)
  const facts = weekFacts(data, weekStart, today)
  const existing = data.weeklyReviews.find((w) => w.weekStart === weekStart)
  const previous = data.weeklyReviews.filter((w) => w.weekStart < weekStart && w.status === 'completed').sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
  const daysLeft = D.diffDays(weekEnd, today)

  if (existing?.status === 'completed') {
    return (
      <>
        <Banner action={<button className="btn btn-sm" onClick={() => void actions.review.reopenWeekly(existing)} type="button">Edit review</button>} icon="check" title={`Review complete for ${D.short(weekStart)} to ${D.short(weekEnd)}.`} tone="success">Your top 3 are on next week’s plan.</Banner>
        <ReviewCard review={existing} />
      </>
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const complete = submitter?.value === 'complete'
    const fd = new FormData(form)
    const topThree = fd.getAll('next').map((value) => String(value).trim())
    if (complete && !topThree.some(Boolean)) {
      setError('Add at least one priority for next week. That’s the point of the review.')
      form.querySelector<HTMLInputElement>('#next-0')?.focus()
      return
    }
    setError('')
    setBusy(complete ? 'complete' : 'draft')
    const text = (name: string) => String(fd.get(name) ?? '').trim()
    const saved = await actions.review.saveWeekly(existing, weekStart, { wins: text('wins'), problems: text('blocked'), change: text('change'), topThree }, complete, facts, Boolean(fd.get('asTasks')))
    setBusy(undefined)
    if (saved && complete) celebrate()
  }

  const values = existing ?? { wins: '', problems: '', change: '', topThree: ['', '', ''], updatedAt: '' }
  const reviewDay = DAY_NAMES[(data.settings.weekStart + 6) % 7]

  return (
    <>
      <div className="review-intro">
        <h2>Week of {D.short(weekStart)} to {D.short(weekEnd)}</h2>
        <p className="small muted">{daysLeft > 0 ? `${plural(daysLeft, 'day')} left this week. Reviews work best on ${reviewDay} evening, but you can start any time.` : 'Last day of the week. Good time to review.'} About 10 minutes.</p>
      </div>

      <section aria-labelledby="facts-h" className="section">
        <div className="section-head"><h2 id="facts-h">This week in Hop</h2><span className="section-meta">Filled in for you</span></div>
        <div className="metric-row metric-row-6">
          <FactTile label="Tasks done" value={facts.tasks} />
          <FactTile label="Habit consistency" value={`${facts.habitsPct}%`} />
          <FactTile label="Learning" value={D.minutes(facts.learningMin) || '0 min'} />
          <FactTile label="Applications" value={facts.applications} />
          <FactTile label="Replies" value={facts.responses} />
          <FactTile label="Interviews" value={facts.interviews} />
        </div>
        {(facts.shipped.length > 0 || facts.evidence.length > 0) && (
          <div className="panel panel-pad review-shipped">
            {facts.shipped.length > 0 && <div><h3 className="small">Project work done</h3><ul className="dot-list small">{facts.shipped.map((title, index) => <li key={index}>{title}</li>)}</ul></div>}
            {facts.evidence.length > 0 && <div><h3 className="small">Evidence added</h3><ul className="dot-list small">{facts.evidence.map((title, index) => <li key={index}>{title}</li>)}</ul></div>}
          </div>
        )}
      </section>

      <BeforeYouWrite />

      {previous && (
        <section aria-labelledby="prev-h" className="section">
          <div className="section-head"><h2 id="prev-h">Last week you planned</h2></div>
          <ol className="plan-list">{topThreeOf(previous).map((item, index) => <li key={index}><span className="num">{index + 1}</span>{item}</li>)}</ol>
          <p className="small muted">Did these happen? Use that in your answers below.</p>
        </section>
      )}

      <form aria-labelledby="refl-h2" className="section review-form" key={existing?.id ?? 'new'} noValidate onSubmit={(event) => void submit(event)}>
        <div className="section-head"><h2 id="refl-h2">Your review</h2>{existing && <span className="section-meta">Draft saved {D.timeAgo(existing.updatedAt)}</span>}</div>
        <div className="panel panel-pad form-grid">
          <Field defaultValue={values.wins} label="What went well?" name="wins" placeholder="Wins, however small" type="textarea" />
          <Field defaultValue={values.problems} label="What got in the way?" name="blocked" placeholder="Be specific; this is for you" type="textarea" />
          <Field defaultValue={values.change} label="What will you change?" name="change" placeholder="One adjustment for next week" rows={2} type="textarea" />
          <fieldset className="field">
            <legend className="field-label">Top 3 for next week</legend>
            <div className="top3">
              {[0, 1, 2].map((index) => (
                <div className="top3-row" key={index}>
                  <span aria-hidden="true" className="num">{index + 1}</span>
                  <label className="visually-hidden" htmlFor={`next-${index}`}>Priority {index + 1}</label>
                  <input aria-invalid={index === 0 && error ? true : undefined} className="input" defaultValue={values.topThree[index] ?? ''} id={`next-${index}`} maxLength={200} name="next" placeholder={PLACEHOLDERS[index]} />
                </div>
              ))}
            </div>
            <FieldError error={error} id="next-err" />
          </fieldset>
          <label className="check-line"><input defaultChecked name="asTasks" type="checkbox" /> Add these as tasks for {D.withDay(D.addDays(weekEnd, 1))}</label>
        </div>
        <div className="form-actions">
          <button aria-busy={busy === 'draft' || undefined} className="btn" name="intent" type="submit" value="draft">Save draft</button>
          <button aria-busy={busy === 'complete' || undefined} className="btn btn-primary" name="intent" type="submit" value="complete">Complete review</button>
        </div>
      </form>
    </>
  )
}

/**
 * Radar triage and the coming course deadlines belong in the weekly review: a find nobody decides
 * on is just a bookmark. Five minutes a week keeps the inbox meaningful.
 */
function BeforeYouWrite() {
  const { data } = useHop()
  const today = D.today()
  const inbox = data.finds.filter((f) => f.status === 'inbox')
  const stale = staleFinds(data.finds, today).length
  const deadlines = upcoming(data.courses, today, 10)
  if (!data.finds.length && !data.courses.length) return null
  return (
    <section aria-labelledby="rad-h" className="section">
      <div className="section-head"><h2 id="rad-h">Before you write</h2><span className="section-meta">About 5 minutes</span></div>
      <div className="review-checks">
        <a className="panel panel-pad review-check" href="#/growth/radar">
          <span aria-hidden="true" className="type-tile"><Icon name="radar" /></span>
          <span><strong>{inbox.length ? `Triage ${plural(inbox.length, 'Radar find')}` : 'Radar inbox is empty'}</strong><span className="xs muted">{inbox.length ? (stale ? `${stale} older than 30 days.` : 'Decide what each one becomes.') : 'Nothing waiting.'}</span></span>
        </a>
        <a className="panel panel-pad review-check" href="#/itu">
          <span aria-hidden="true" className="type-tile"><Icon name="school" /></span>
          <span><strong>{deadlines.length ? `${plural(deadlines.length, 'course deadline')} in the next 10 days` : 'No course deadlines in the next 10 days'}</strong><span className="xs muted">{deadlines.length ? deadlines.slice(0, 3).map(({ course, item }) => `${course.code} ${item.title}`).join(', ') : 'Check the İTÜ handbook for calendar dates.'}</span></span>
        </a>
      </div>
    </section>
  )
}

function factsLine(facts: WeekFacts | null) {
  if (!facts) return ''
  return `${facts.tasks} tasks, ${facts.habitsPct}% habits, ${D.minutes(facts.learningMin) || '0 min'} learning, ${plural(facts.applications, 'application')}`
}

function ReviewCard({ review }: { review: WeeklyReview }) {
  const top = topThreeOf(review)
  return (
    <article className="panel panel-pad review-card">
      <header className="review-card-head"><h3>Week of {D.short(review.weekStart)}</h3><span className="xs muted">{factsLine(review.facts)}</span></header>
      <dl className="review-dl">
        <div><dt>Went well</dt><dd>{review.wins || <span className="muted">—</span>}</dd></div>
        <div><dt>Got in the way</dt><dd>{review.problems || <span className="muted">—</span>}</dd></div>
        {review.change && <div><dt>Changing</dt><dd>{review.change}</dd></div>}
        {top.length > 0 && <div><dt>Top 3 next</dt><dd><ol className="plan-list plan-list-sm">{top.map((item, index) => <li key={index}><span className="num">{index + 1}</span>{item}</li>)}</ol></dd></div>}
      </dl>
    </article>
  )
}

/* ---- Monthly review ------------------------------------------------------------------ */
const FOCUS_PLACEHOLDERS = ['e.g. System design, three sessions a week', 'e.g. Five targeted applications', 'e.g. Ship the NLP project demo']

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

function ThisMonth() {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string>()
  const today = D.today()
  const monthStart = reviewMonth(data.monthlyReviews, today)
  const end = monthEnd(monthStart)
  const nextMonth = D.addMonths(monthStart, 1)
  const facts = monthFacts(data, monthStart, today)
  const existing = data.monthlyReviews.find((m) => m.monthStart === monthStart)
  const previous = data.monthlyReviews.filter((m) => m.monthStart < monthStart && m.status === 'completed').sort((a, b) => b.monthStart.localeCompare(a.monthStart))[0]
  const ended = end < today
  const daysLeft = D.diffDays(end, today)
  const daysSoFar = ended ? D.dayOfMonth(end) : D.dayOfMonth(today)

  if (existing?.status === 'completed') {
    return (
      <>
        <Banner action={<button className="btn btn-sm" onClick={() => void actions.review.reopenMonthly(existing)} type="button">Edit review</button>} icon="check" title={`Review complete for ${D.monthLong(monthStart)}.`} tone="success">Your focus for {D.monthLong(nextMonth)} is set.</Banner>
        <MonthCard review={existing} />
      </>
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const complete = submitter?.value === 'complete'
    const fd = new FormData(form)
    const focus = fd.getAll('focus').map((value) => String(value).trim())
    if (complete && !focus.some(Boolean)) {
      setError('Choose at least one focus for next month. That’s what the review is for.')
      form.querySelector<HTMLInputElement>('#focus-0')?.focus()
      return
    }
    setError('')
    setBusy(complete ? 'complete' : 'draft')
    const text = (name: string) => String(fd.get(name) ?? '').trim()
    const saved = await actions.review.saveMonthly(existing, monthStart, { highlights: text('highlights'), keep: text('keep'), stop: text('stop'), change: text('change'), focus }, complete, facts)
    setBusy(undefined)
    if (saved && complete) celebrate()
  }

  const values = existing ?? { highlights: '', keep: '', stop: '', change: '', focus: ['', '', ''], updatedAt: '' }

  return (
    <>
      <div className="review-intro">
        <h2>{D.monthLong(monthStart)}</h2>
        <p className="small muted">{ended ? `${D.monthLong(monthStart)} has ended. Review it this week, while it’s fresh.` : daysLeft > 2 ? `${plural(daysLeft, 'day')} left this month. Reviews work best in the last days of the month, but you can start any time.` : 'The month is almost over. Good time to review.'} About 20 minutes.</p>
      </div>

      <section aria-labelledby="mfacts-h" className="section">
        <div className="section-head"><h2 id="mfacts-h">{ended ? 'The month' : 'This month'} in Hop</h2><span className="section-meta">Filled in for you</span></div>
        <div className="metric-row metric-row-4">
          <FactTile label="Meaningful days" value={`${facts.meaningfulDays} of ${daysSoFar}`} />
          <FactTile label="Tasks done" value={facts.tasks} />
          <FactTile label="Habit consistency" value={`${facts.habitsPct}%`} />
          <FactTile label="Learning" value={D.minutes(facts.learningMin) || '0 min'} />
          <FactTile label="Applications" value={facts.applications} />
          <FactTile label="Replies" value={facts.responses} />
          <FactTile label="Interviews" value={facts.interviews} />
          <FactTile label="Offers" value={facts.offers} />
        </div>
        <MonthLists facts={facts} />
        {facts.neglectedAreas.length > 0 && (
          <Banner icon="alert" title={`Nothing happened in ${listOf(facts.neglectedAreas)} this month.`} tone="info">You have an active goal there. Pause it, or plan one step for next month.</Banner>
        )}
      </section>

      {previous && previous.focus.filter(Boolean).length > 0 && (
        <section aria-labelledby="mprev-h" className="section">
          <div className="section-head"><h2 id="mprev-h">For {D.monthLong(D.addMonths(previous.monthStart, 1))} you chose to focus on</h2></div>
          <ol className="plan-list">{previous.focus.filter(Boolean).map((item, index) => <li key={index}><span className="num">{index + 1}</span>{item}</li>)}</ol>
          <p className="small muted">Did the month go that way? Use that in your answers below.</p>
        </section>
      )}

      <form aria-labelledby="mrefl-h2" className="section review-form" key={existing?.id ?? `new-${monthStart}`} noValidate onSubmit={(event) => void submit(event)}>
        <div className="section-head"><h2 id="mrefl-h2">Your review</h2>{existing && <span className="section-meta">Draft saved {D.timeAgo(existing.updatedAt)}</span>}</div>
        <div className="panel panel-pad form-grid">
          <Field defaultValue={values.highlights} label="What were the highlights?" name="highlights" placeholder="What you’re glad happened" type="textarea" />
          <Field defaultValue={values.keep} label="What should you continue?" name="keep" placeholder="What worked and is worth repeating" type="textarea" />
          <Field defaultValue={values.stop} label="What should you stop?" name="stop" placeholder="What cost time or energy without paying back" type="textarea" />
          <Field defaultValue={values.change} label="What will you change?" name="change" placeholder="One adjustment for next month" rows={2} type="textarea" />
          <fieldset className="field">
            <legend className="field-label">Focus for {D.monthLong(nextMonth)}</legend>
            <div className="top3">
              {[0, 1, 2].map((index) => (
                <div className="top3-row" key={index}>
                  <span aria-hidden="true" className="num">{index + 1}</span>
                  <label className="visually-hidden" htmlFor={`focus-${index}`}>Focus {index + 1}</label>
                  <input aria-invalid={index === 0 && error ? true : undefined} className="input" defaultValue={values.focus[index] ?? ''} id={`focus-${index}`} maxLength={200} name="focus" placeholder={FOCUS_PLACEHOLDERS[index]} />
                </div>
              ))}
            </div>
            <FieldError error={error} id="focus-err" />
          </fieldset>
        </div>
        <div className="form-actions">
          <button aria-busy={busy === 'draft' || undefined} className="btn" name="intent" type="submit" value="draft">Save draft</button>
          <button aria-busy={busy === 'complete' || undefined} className="btn btn-primary" name="intent" type="submit" value="complete">Complete review</button>
        </div>
      </form>
    </>
  )
}

const listOf = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

function MonthLists({ facts }: { facts: MonthFacts }) {
  const lists: [string, string[]][] = [['Projects completed', facts.projectsCompleted], ['Milestones reached', facts.milestones], ['Evidence added', facts.evidence]]
  const shown = lists.filter(([, items]) => items.length)
  if (!facts.goals.length && !shown.length) return null
  return (
    <div className="panel panel-pad review-shipped">
      {facts.goals.length > 0 && (
        <div>
          <h3 className="small">Goal movement</h3>
          <ul className="dot-list small">{facts.goals.map((g, index) => <li key={index}>{g.name}: {g.from}% → {g.to}%{g.to !== g.from ? ` (${signed(g.to - g.from)})` : ', unchanged'}</li>)}</ul>
        </div>
      )}
      {shown.map(([title, items]) => <div key={title}><h3 className="small">{title}</h3><ul className="dot-list small">{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}
    </div>
  )
}

function monthFactsLine(facts: MonthFacts | null) {
  if (!facts) return ''
  return `${plural(facts.meaningfulDays, 'meaningful day')}, ${facts.tasks} tasks, ${D.minutes(facts.learningMin) || '0 min'} learning, ${plural(facts.applications, 'application')}`
}

function MonthCard({ review }: { review: MonthlyReview }) {
  const focus = review.focus.filter(Boolean)
  return (
    <article className="panel panel-pad review-card">
      <header className="review-card-head"><h3>{D.monthLong(review.monthStart)}</h3><span className="xs muted">{monthFactsLine(review.facts)}</span></header>
      <dl className="review-dl">
        {review.highlights && <div><dt>Highlights</dt><dd>{review.highlights}</dd></div>}
        <div><dt>Continue</dt><dd>{review.keep || <span className="muted">—</span>}</dd></div>
        <div><dt>Stop</dt><dd>{review.stop || <span className="muted">—</span>}</dd></div>
        {review.change && <div><dt>Changing</dt><dd>{review.change}</dd></div>}
        {focus.length > 0 && <div><dt>Focus next</dt><dd><ol className="plan-list plan-list-sm">{focus.map((item, index) => <li key={index}><span className="num">{index + 1}</span>{item}</li>)}</ol></dd></div>}
      </dl>
    </article>
  )
}

function History() {
  const { data } = useHop()
  const list = [
    ...data.weeklyReviews.filter((w) => w.status === 'completed').map((review) => ({ end: D.addDays(review.weekStart, 6), card: <ReviewCard key={review.id} review={review} /> })),
    ...data.monthlyReviews.filter((m) => m.status === 'completed').map((review) => ({ end: monthEnd(review.monthStart), card: <MonthCard key={review.id} review={review} /> })),
  ].sort((a, b) => b.end.localeCompare(a.end))
  if (!list.length) return <Empty body="Completed weekly and monthly reviews collect here, so you can see patterns over months." icon="review" pad={false} title="No past reviews yet" />
  return <div className="stack stack-sm">{list.map((item) => item.card)}</div>
}

function Reflections() {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const list = [...data.reflections].sort((a, b) => b.date.localeCompare(a.date))
  if (!list.length) return <Empty action={() => editors.reflection()} actionLabel="Write today’s reflection" body="A two-minute note at the end of the day: what you did, what you learned, what’s first tomorrow." title="No reflections yet" />
  return (
    <div className="stack stack-sm">
      {list.map((r) => (
        <article className="panel panel-pad reflection" key={r.id}>
          <header className="review-card-head">
            <h3>{D.relative(r.date)}{D.diffDays(today, r.date) <= 1 && <span className="faint small"> {D.withDay(r.date)}</span>}</h3>
            <span className="xs muted">{[r.energy && `Energy ${r.energy}/5`, r.focus && `focus ${r.focus}/5`].filter(Boolean).join(', ')}</span>
          </header>
          <dl className="review-dl">
            {r.accomplished && <div><dt>Did</dt><dd>{r.accomplished}</dd></div>}
            {r.learned && <div><dt>Learned</dt><dd>{r.learned}</dd></div>}
            {r.badly && <div><dt>Didn’t go well</dt><dd>{r.badly}</dd></div>}
            {r.tomorrow && <div><dt>Tomorrow</dt><dd>{r.tomorrow}</dd></div>}
          </dl>
          <button className="link-btn small" onClick={() => editors.reflection(r.date)} type="button">Edit</button>
        </article>
      ))}
    </div>
  )
}
