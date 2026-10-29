// Today: "Here is what matters." One next action, then the rest of today's Musts, Shoulds and
// habits. The side shows what needs a decision soon, then the horizon.
import { Fragment } from 'react'
import * as D from '../lib/dates.ts'
import { STAGE_LABEL, agenda, agendaLabel, attention, goalHealth, goalProgress, habitDue, habitKept, nextForGoal, orgOf, plural, todayPlan, weekFacts } from '../lib/rules.ts'
import type { Habit, Task } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon, Pad } from '../components/Icon.tsx'
import { AttentionList, HabitRow, InlineAdd, TaskRow } from '../components/rows.tsx'
import { DateChip, Empty, ProgressBar } from '../components/ui.tsx'
import { classesOn, nextClass } from '../lib/uni.ts'
import { isTrackHabit } from '../lib/day.ts'
import { slotsOn } from '../lib/schedule.ts'
import { YourDay } from './YourDay.tsx'
import { loanLabel, loanState, openLoan, progress } from '../lib/books.ts'
import { formatMoney, monthOf, monthSummary } from '../lib/money.ts'
import { dayProgress, doneSession, minimumOn, planFor } from '../lib/practice.ts'
import { PracticeRow } from './Turkish.tsx'
import { useHop } from '../store/store.ts'
import { useToast } from '../components/ui-context.ts'

function greeting() {
  const hour = D.hourNow()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}


export function Today() {
  const { data, ui, setUi } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const toast = useToast()
  const today = D.today()
  const plan = todayPlan(data.tasks, today)
  const skipped = ui.skipped
  const ordered = [...plan.must.filter((t) => !skipped.includes(t.id)), ...plan.should.filter((t) => !skipped.includes(t.id)), ...plan.all.filter((t) => skipped.includes(t.id))]
  const next = ordered[0]
  const restMust = plan.must.filter((t) => t !== next)
  const restShould = plan.should.filter((t) => t !== next)
  const doneToday = data.tasks.filter((t) => t.completedAt && D.ymdOf(t.completedAt) === today)
  // A habit linked to the language track is the Türkçe plan's time; it's counted there, not here.
  const habitsToday = data.habits.filter((h) => habitDue(h, today) && !isTrackHabit(h, data))
  // Habits with a time today are in Your day; the Habits section keeps the rest.
  const untimedToday = habitsToday.filter((h) => !slotsOn(h.slots, today).length)
  const habitsDone = habitsToday.filter((h) => habitKept(h, data.completions, today)).length
  const attentionItems = attention(data, today)
  const urgent = attentionItems.filter((item) => item.level === 'critical').length
  // Courses, books in hand or a language track are enough to make Today useful: they all show here.
  const fresh = !data.goals.length && !data.tasks.length && !data.courses.length && !data.books.some((b) => b.status === 'reading' || openLoan(b)) && !data.settings.languageTrack
  const learningMin = weekFacts(data, today).learningMin
  const name = data.settings.name
  const lastActive = data.tasks.map((t) => t.completedAt).filter(Boolean).sort().at(-1)
  const away = lastActive ? D.diffDays(today, D.ymdOf(lastActive)) : 0
  const returning = away >= 5
  const title = returning ? `Welcome back${name ? `, ${name}` : ''}` : `${greeting()}${name ? `, ${name}` : ''}`
  const subtitle = returning
    ? `It’s been ${away} days. Nothing is lost; here is what matters now.`
    : `${D.long(today)}. ${plan.all.length ? `${plural(plan.all.length, 'thing')} planned` : 'Nothing planned yet'}${urgent ? `, ${plural(urgent, 'urgent item')}` : ''}.`

  const addToday = (value: string) => actions.tasks.add({ title: value, scheduledDate: today }, 'Added to today')

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text">
          <h1 tabIndex={-1}>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {!fresh && (
          <dl aria-label="Today so far" className="today-stats">
            <div><dt>Tasks done</dt><dd className="num">{doneToday.length}</dd></div>
            <div><dt>Habits</dt><dd className="num">{habitsDone}<span className="faint">/{habitsToday.length}</span></dd></div>
            <div><dt>Learning</dt><dd className="num">{learningMin ? D.minutes(learningMin) : '0 min'}</dd></div>
          </dl>
        )}
      </header>

      {fresh ? <FirstRun onAdd={addToday} /> : (
        <div className="split today-split">
          <div className="stack">
            <NextUp next={next} plan={plan} onSkip={(task) => { setUi({ skipped: [...skipped.filter((id) => id !== task.id), task.id] }); toast('Moved to the end of today’s list') }} />

            <YourDay />

            {attentionItems.length > 0 && (
              <section aria-labelledby="attn-m" className="section phone-only">
                <div className="section-head"><h2 id="attn-m">Needs attention <span className="count count-attention">{attentionItems.length}</span></h2></div>
                <AttentionList items={attentionItems} max={3} />
              </section>
            )}

            <section aria-labelledby="prio-h" className="section">
              <div className="section-head">
                <h2 id="prio-h">Today’s priorities</h2>
                <a className="small" href="#/plan">Open plan</a>
              </div>
              {restMust.length || restShould.length
                ? <div className="rows">{restMust.map((t) => <TaskRow key={t.id} showMust task={t} />)}{restShould.map((t) => <TaskRow key={t.id} task={t} />)}</div>
                : next && <p className="small muted">That’s the only thing planned. Keep the day light, or pull something in from your plan.</p>}
              <InlineAdd emptyMessage="Type the task first, then press Add." id="today-add-input" label="Add a task for today" onAdd={addToday} placeholder="Add a task for today" />
              {doneToday.length > 0 && (
                <details className="done-list">
                  <summary>Done today <span className="count">{doneToday.length}</span></summary>
                  <div className="rows">{doneToday.map((t) => <TaskRow key={t.id} menu={false} task={t} />)}</div>
                </details>
              )}
            </section>

            {(untimedToday.length > 0 || habitsToday.length === 0) && (
              <section aria-labelledby="habit-h" className="section">
                <div className="section-head">
                  <h2 id="habit-h">Habits</h2>
                  <a className="small" href="#/plan/habits">Manage</a>
                </div>
                {untimedToday.length
                  ? <div className="rows">{untimedToday.map((h) => <Fragment key={h.id}><HabitRow habit={h} /><BlockStep habit={h} /></Fragment>)}</div>
                  : <Empty body="Habits show up here on the days they’re scheduled." icon="leaf" pad={false} title="No habits scheduled today" />}
              </section>
            )}

            <TurkishToday />

            <ReadingNow />
          </div>

          <aside aria-label="Context" className="stack">
            <section aria-labelledby="attn-h" className="section hide-phone">
              <div className="section-head"><h2 id="attn-h">Needs attention {attentionItems.length > 0 && <span className="count count-attention">{attentionItems.length}</span>}</h2></div>
              <AttentionList items={attentionItems} />
            </section>
            <FinancesToday />
            <ClassesToday />
            <ComingUp />
            <GoalsMini />
            <ReflectionCard onOpen={() => editors.reflection(today)} />
          </aside>
        </div>
      )}
    </div>
  )
}

function NextUp({ next, plan, onSkip }: { next: Task | undefined; plan: ReturnType<typeof todayPlan>; onSkip: (task: Task) => void }) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const today = D.today()

  if (!next) {
    return (
      <section aria-labelledby="next-h" className="next-hop next-hop-empty">
        <p className="next-eyebrow" id="next-h"><Pad size={18} /> Next up</p>
        <h2 className="next-title">Nothing is planned for today yet.</h2>
        <p className="muted">Choose one useful action. Small is fine.</p>
        <div className="next-actions">
          <button className="btn btn-primary" onClick={() => editors.add()} type="button"><Icon className="icon-sm" name="plus" />Plan a task</button>
          <a className="btn" href="#/plan/tasks">Pick from your list</a>
        </div>
      </section>
    )
  }

  const goal = data.goals.find((g) => g.id === next.goalId)
  const opportunity = data.opportunities.find((o) => o.id === next.opportunityId)
  const remaining = plan.all.length - 1
  return (
    <section aria-labelledby="next-h" className="next-hop" key={next.id}>
      <div className="next-top">
        <p className="next-eyebrow" id="next-h"><Pad size={18} /> Next up{plan.must.includes(next) && <span className="prio prio-must"><Icon className="icon-sm" name="flag" />Must</span>}</p>
        <span className="xs muted">{remaining ? `${plural(remaining, 'more thing')} after this` : 'Last thing for today'}</span>
      </div>
      <h2 className="next-title">{next.title}</h2>
      <div className="next-meta">
        {next.dueDate && <span className={next.dueDate < today ? 'is-danger' : D.diffDays(next.dueDate, today) <= 1 ? 'is-warning' : ''}><Icon name="clock" />{D.dueLabel(next.dueDate, today)}</span>}
        {next.estimatedMinutes && <span><Icon name="clock" />About {D.minutes(next.estimatedMinutes)}</span>}
        {opportunity && <a href={`#/career/${opportunity.id}`}><Icon name="career" />{orgOf(opportunity)}: {STAGE_LABEL[opportunity.stage]}</a>}
        {goal && <a href={`#/goals/${goal.id}`}><Icon name="goals" />{goal.name} {goalProgress(goal).measured && <span className="faint num">{goalProgress(goal).pct}%</span>}</a>}
      </div>
      {next.description && <p className="next-notes">{next.description}</p>}
      <div className="next-actions">
        <button className="btn btn-primary btn-lg" onClick={() => void actions.tasks.toggle(next)} type="button"><Icon name="check" />Mark done</button>
        <button className="btn btn-lg" disabled={!remaining} onClick={() => onSkip(next)} type="button">Not now</button>
        <button className="btn btn-ghost btn-lg" onClick={() => editors.task(next)} type="button">Edit</button>
      </div>
    </section>
  )
}

/**
 * On a block day, a habit linked to a goal shows the goal's next task, so work kept undated still
 * has a place on Today. It's only a suggestion inside the habit: Today's plan doesn't change.
 */
function BlockStep({ habit }: { habit: Habit }) {
  const { data, ui, setUi } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const today = D.today()
  const goal = habit.goalId ? data.goals.find((g) => g.id === habit.goalId) : undefined
  if (!goal || !habitDue(habit, today) || habitKept(habit, data.completions, today)) return null
  const { next, open } = nextForGoal(goal.id, data.tasks, ui.skipped)
  if (!next) return null
  const started = next.status === 'in_progress'
  return (
    <div className="row row-link block-step">
      <div className="row-main">
        <button className="row-open" onClick={() => editors.task(next)} type="button"><span className="muted">Next for {goal.name}:</span> {next.title}</button>
        {started && <div className="row-meta"><span><Icon name="play" />In progress</span></div>}
      </div>
      <div className="row-actions">
        {started
          ? <button className="btn btn-sm" onClick={() => void actions.tasks.toggle(next)} type="button"><Icon className="icon-sm" name="check" />Done</button>
          : <button className="btn btn-sm" onClick={() => void actions.tasks.update(next, { status: 'in_progress' }, 'Task started', true)} type="button"><Icon className="icon-sm" name="play" />Start</button>}
        <button className="btn btn-sm btn-ghost" disabled={open < 2} onClick={() => setUi({ skipped: [...ui.skipped.filter((id) => id !== next.id), next.id] })} type="button">Skip</button>
      </div>
    </div>
  )
}

/** Today's Turkish: how much of the plan is done, and the next few activities to tick off. */
function TurkishToday() {
  const { data } = useHop()
  const today = D.today()
  if (!data.settings.languageTrack) return null
  const plan = planFor(data.practiceActivities, today)
  if (!plan.length) return null
  const day = dayProgress(data.practiceActivities, data.practiceSessions, today)
  const minimum = minimumOn(data.practiceActivities, data.practiceSessions, today)
  // The minimum comes first; extended activities wait on the Türkçe page.
  const open = plan.filter((a) => a.tier !== 'extended' && !doneSession(data.practiceSessions, a, today))
  const next = [...open.filter((a) => a.tier === 'minimum'), ...open.filter((a) => a.tier !== 'minimum')].slice(0, 3)
  return (
    <section aria-labelledby="tr-today-h" className="section">
      <div className="section-head"><h2 id="tr-today-h">Türkçe</h2><a className="small" href="#/turkish">Today’s plan</a></div>
      <div className="practice-mini">
        <ProgressBar label="Today’s Turkish practice" pct={day.pct} />
        <span className="small num">{D.minutes(day.done) || '0 min'} of {D.minutes(day.planned)}</span>
      </div>
      {minimum && <p className="small">{minimum.kept ? <><Icon className="icon-sm" name="check" /> Minimum kept today.</> : `Minimum: ${minimum.done} of ${minimum.planned} done.`}</p>}
      {next.length
        ? <div className="rows">{next.map((a) => <PracticeRow activity={a} compact date={today} key={a.id} />)}</div>
        : <p className="small muted">Today’s plan is done. Anything more is a bonus.</p>}
    </section>
  )
}

/** Books in progress, one line each, so logging pages on the commute is one tap away. */
function ReadingNow() {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const books = data.books.filter((b) => b.status === 'reading')
  if (!books.length) return null
  return (
    <section aria-labelledby="read-h" className="section">
      <div className="section-head"><h2 id="read-h">Reading</h2><a className="small" href="#/growth/reading">All books</a></div>
      <div className="rows">
        {books.map((b) => {
          const { page, pct } = progress(b)
          const loan = openLoan(b)
          const state = loan ? loanState(loan, today) : null
          return (
            <div className="row row-link" key={b.id}>
              <span aria-hidden="true" className="type-tile type-book"><Icon name="library" /></span>
              <div className="row-main">
                <button className="row-open" onClick={() => editors.bookDrawer(b)} type="button">{b.title}</button>
                <div className="row-meta">
                  <span className="num">{b.pages ? `Page ${page} of ${b.pages} (${pct}%)` : page ? `Page ${page}` : 'Not started'}</span>
                  {b.log.some((entry) => entry.date === today) && <span><Icon name="check" />Logged today</span>}
                  {loan && state && <span className={`loan-state${state.overdue ? ' is-danger' : state.daysLeft <= 3 ? ' is-warning' : ''}`}><Icon name="library" />{loanLabel(loan, today)}</span>}
                </div>
              </div>
              <div className="row-actions"><button className="btn btn-sm" onClick={() => editors.logPages(b)} type="button"><Icon className="icon-sm" name="book" />Log pages</button></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** What's safe to spend today and what was spent, with Log spending one tap away. Hidden until Finances is set up. */
function FinancesToday() {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  if (!data.wallets.length) return null
  const m = monthSummary(data, monthOf(today), today)
  return (
    <section aria-labelledby="money-h" className="section">
      <div className="section-head"><h2 id="money-h">Finances</h2><a className="small" href="#/finances">This month</a></div>
      <div className="panel panel-pad money-today">
        <div>
          {m.budget
            ? <><span className="metric-label">Safe to spend today</span><span className={`metric-value num${m.left < 0 ? ' is-danger' : ''}`}>{formatMoney(m.safeToday ?? 0)}</span></>
            : <span className="small muted">Set budgets in Finances to see what’s safe to spend each day.</span>}
          <span className="xs muted num">Spent today {formatMoney(m.spentToday)}{m.left < 0 ? `, ${formatMoney(-m.left)} over this month’s budget` : ''}</span>
        </div>
        <button className="btn btn-sm" onClick={() => editors.logSpending()} type="button"><Icon className="icon-sm" name="plus" />Log spending</button>
      </div>
    </section>
  )
}

/** Classes today, from the schedule of the courses being taken. Hidden when none is coming this week. */
function ClassesToday() {
  const { data } = useHop()
  const today = D.today()
  const list = classesOn(data, today)
  const next = list.length ? null : nextClass(data, today)
  if (!list.length && !next) return null
  const now = D.timeOf(new Date().toISOString())
  return (
    <section aria-labelledby="cls-h" className="section">
      <div className="section-head"><h2 id="cls-h">Classes today</h2><a className="small" href="#/itu/courses">Courses</a></div>
      {list.length
        ? (
          <ol className="mini-agenda">
            {list.map(({ course, slot }) => {
              const state = now >= slot.end ? 'is-past' : now >= slot.start ? 'is-now' : ''
              return (
                <li className={state} key={`${course.id}-${slot.start}`}>
                  <span className="class-time num">{slot.start}<span className="faint">{slot.end}</span></span>
                  <span className="mini-main"><a className="mini-title" href={`#/itu/courses/${course.id}`}>{course.code} {course.name}</a><span className="xs muted">{slot.room}{state === 'is-now' ? `${slot.room ? ', ' : ''}in class now` : state === 'is-past' ? `${slot.room ? ', ' : ''}finished` : ''}</span></span>
                </li>
              )
            })}
          </ol>
        )
        : <p className="small muted">No classes today.{next ? ` Next: ${next.course.code} ${D.inSentence(next.date, today)} at ${next.slot.start}.` : ''}</p>}
    </section>
  )
}

function ComingUp() {
  const { data } = useHop()
  const today = D.today()
  const groups = agenda(data, D.addDays(today, 1), 6)
    .map((group) => ({ ...group, items: group.items.filter((item) => item.kind !== 'task') }))
    .filter((group) => group.items.length)
  return (
    <section aria-labelledby="up-h" className="section">
      <div className="section-head"><h2 id="up-h">Coming up</h2><a className="small" href="#/plan">Agenda</a></div>
      {groups.length
        ? <ol className="mini-agenda">{groups.flatMap((group) => group.items.map((item, index) => (
            <li key={`${group.date}-${index}`}>
              <DateChip date={group.date} />
              <span className="mini-main"><span className="mini-title">{item.title}</span><span className="xs muted">{agendaLabel(item)}{item.time ? `, ${item.time}` : ''}</span></span>
            </li>
          )))}</ol>
        : <p className="small muted">No interviews, deadlines or events in the next 7 days.</p>}
    </section>
  )
}

function GoalsMini() {
  const { data } = useHop()
  const today = D.today()
  const active = data.goals.filter((g) => g.status === 'active')
  if (!active.length) return null
  return (
    <section aria-labelledby="goals-h" className="section">
      <div className="section-head"><h2 id="goals-h">Goals</h2><a className="small" href="#/goals">All goals</a></div>
      <div className="rows">
        {active.map((g) => {
          const progress = goalProgress(g)
          const health = goalHealth(g, data, today)
          return (
            <a className="goal-mini" href={`#/goals/${g.id}`} key={g.id}>
              <span className="goal-mini-top"><span className="goal-mini-name">{g.name}</span><span className="num small">{progress.measured ? `${progress.pct}%` : '–'}</span></span>
              <ProgressBar label={`${g.name} progress`} pct={progress.pct} />
              <span className="xs muted">{progress.measured ? `${progress.done} of ${progress.total} criteria met` : 'No success criteria yet'}{health.tone === 'warning' && <>. <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{health.label}</span></>}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

function ReflectionCard({ onOpen }: { onOpen: () => void }) {
  const { data } = useHop()
  const today = D.today()
  const existing = data.reflections.find((r) => r.date === today)
  if (existing) {
    return (
      <section aria-labelledby="refl-h" className="section reflect-done">
        <div className="section-head"><h2 id="refl-h">Today’s reflection</h2><button className="link-btn small" onClick={onOpen} type="button">Edit</button></div>
        <p className="small"><strong>Done:</strong> {existing.accomplished || '—'}</p>
        {existing.tomorrow && <p className="small"><strong>Tomorrow:</strong> {existing.tomorrow}</p>}
      </section>
    )
  }
  const evening = D.hourNow() >= 18
  return (
    <section aria-labelledby="refl-h" className={`section reflect${evening ? ' reflect-evening' : ''}`}>
      <div className="section-head"><h2 id="refl-h">{evening ? 'Close the day' : 'Evening reflection'}</h2></div>
      <p className="small muted">{evening ? 'Two minutes. What got done, what you learned, what comes first tomorrow.' : 'Opens up after 6 pm. You can write one any time.'}</p>
      <button className={`btn${evening ? ' btn-primary' : ''}`} onClick={onOpen} type="button"><Icon className="icon-sm" name="edit" />Write reflection</button>
    </section>
  )
}

function FirstRun({ onAdd }: { onAdd: (value: string) => Promise<unknown> }) {
  const editors = useEditors()
  const cards: [string, string, string, () => void, string][] = [
    ['goals', 'Set one direction', 'A goal with a reason and what success looks like.', () => editors.goal(), 'Add a goal'],
    ['career', 'Track an opportunity', 'A role, internship or program you are considering.', () => editors.opportunity(), 'Add opportunity'],
    ['leaf', 'Start a habit', 'Something small you want to repeat on set days.', () => editors.habit(), 'Add a habit'],
  ]
  return (
    <div className="first-run">
      <section className="next-hop next-hop-empty">
        <p className="next-eyebrow"><Pad size={18} /> Start small</p>
        <h2 className="next-title">Add one thing you’ll do today.</h2>
        <p className="muted">Hop gets useful from the first task. Goals, habits and opportunities can come later.</p>
        <InlineAdd emptyMessage="Type the task first, then press Add." id="today-add-first" label="Add a task for today" large onAdd={onAdd} placeholder="e.g. Read the job description for the Getir role" primary />
      </section>
      <div className="first-run-grid">
        {cards.map(([icon, title, body, onClick, cta]) => (
          <div className="panel panel-pad first-card" key={title}>
            <span className="first-icon"><Icon name={icon} /></span>
            <h3>{title}</h3><p className="small muted">{body}</p>
            <button className="btn btn-sm" onClick={onClick} type="button">{cta}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
