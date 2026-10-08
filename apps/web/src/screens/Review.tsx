// Review: weekly review and daily reflections. Hop fills in the facts; you write the judgement.
// The output is next week's top 3, which become real tasks.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { plural, weekFacts } from '../lib/rules.ts'
import type { Route } from '../lib/router.ts'
import type { WeekFacts, WeeklyReview } from '../lib/types.ts'
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
  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Review</h1><p>What worked, what didn’t, and what changes next.</p></div>
        <div className="page-head-actions"><button className="btn" onClick={() => editors.reflection()} type="button"><Icon className="icon-sm" name="edit" />Today’s reflection</button></div>
      </header>
      <Tabs active={tab} items={[['week', 'This week', '#/review'], ['reflections', 'Reflections', '#/review/reflections', data.reflections.length], ['history', 'Past reviews', '#/review/history', data.weeklyReviews.filter((w) => w.status === 'completed').length]]} label="Review sections" />
      {tab === 'reflections' ? <Reflections /> : tab === 'history' ? <History /> : <ThisWeek />}
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

function History() {
  const { data } = useHop()
  const list = data.weeklyReviews.filter((w) => w.status === 'completed').sort((a, b) => b.weekStart.localeCompare(a.weekStart))
  if (!list.length) return <Empty body="Completed weekly reviews collect here, so you can see patterns over months." icon="review" pad={false} title="No past reviews yet" />
  return <div className="stack stack-sm">{list.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
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
