// Today: "Here is what matters." One next action, then the rest of today's Musts, Shoulds and
// habits. The side shows what needs a decision soon, then the horizon.
import * as D from '../lib/dates.ts'
import { STAGE_LABEL, agenda, agendaLabel, attention, goalHealth, goalProgress, habitDone, habitDue, orgOf, plural, todayPlan, weekFacts } from '../lib/rules.ts'
import type { Task } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon, Pad } from '../components/Icon.tsx'
import { AttentionList, HabitRow, InlineAdd, TaskRow } from '../components/rows.tsx'
import { DateChip, Empty, ProgressBar } from '../components/ui.tsx'
import { classesOn, currentTerm, nextClass, taking } from '../lib/uni.ts'
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
  const habitsToday = data.habits.filter((h) => habitDue(h, today))
  const habitsDone = habitsToday.filter((h) => habitDone(h, data.completions, today)).length
  const attentionItems = attention(data, today)
  const urgent = attentionItems.filter((item) => item.level === 'critical').length
  // Courses alone are enough to make Today useful: their deadlines and classes show here.
  const fresh = !data.goals.length && !data.tasks.length && !data.courses.length
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

            <section aria-labelledby="habit-h" className="section">
              <div className="section-head">
                <h2 id="habit-h">Habits</h2>
                <a className="small" href="#/plan/habits">Manage</a>
              </div>
              {habitsToday.length
                ? <div className="rows">{habitsToday.map((h) => <HabitRow habit={h} key={h.id} />)}</div>
                : <Empty body="Habits show up here on the days they’re scheduled." icon="leaf" pad={false} title="No habits scheduled today" />}
            </section>
          </div>

          <aside aria-label="Context" className="stack">
            <section aria-labelledby="attn-h" className="section hide-phone">
              <div className="section-head"><h2 id="attn-h">Needs attention {attentionItems.length > 0 && <span className="count count-attention">{attentionItems.length}</span>}</h2></div>
              <AttentionList items={attentionItems} />
            </section>
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

/** Classes today, from the İTÜ course schedule. Hidden outside term. */
function ClassesToday() {
  const { data } = useHop()
  const today = D.today()
  if (!currentTerm(data.terms, today) || !taking(data.courses).some((c) => c.schedule.length)) return null
  const list = classesOn(data.courses, today)
  const next = list.length ? null : nextClass(data.courses, today)
  const now = D.timeOf(new Date().toISOString())
  return (
    <section aria-labelledby="cls-h" className="section">
      <div className="section-head"><h2 id="cls-h">Classes today</h2><a className="small" href="#/itu">İTÜ</a></div>
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
        : <p className="small muted">No classes today.{next ? ` Next: ${next.course.code} ${D.relative(next.date, today).toLowerCase()} at ${next.slot.start}.` : ''}</p>}
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
          const health = goalHealth(g, data.tasks, today)
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
