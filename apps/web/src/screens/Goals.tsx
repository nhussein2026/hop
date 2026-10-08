// Goals: long-term direction. Progress = success criteria met, so the number is always
// explainable. Achieving a goal is the user's decision, never automatic.
import * as D from '../lib/dates.ts'
import { capitalize, goalBaseline, goalHealth, goalProgress, isOpen, sortTasks } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Goal } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { HabitRow, InlineAdd, TaskRow } from '../components/rows.tsx'
import { Badge, Banner, Empty, Menu, ProgressBar } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { celebrate } from '../lib/notifications.ts'
import { useConfirm } from '../components/confirm.tsx'

export function Goals({ id }: { id?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  if (id) return <GoalDetail id={id} />
  const today = D.today()
  const active = data.goals.filter((g) => g.status === 'active')
  const groups: [string, Goal[]][] = [
    ['Paused', data.goals.filter((g) => g.status === 'paused')],
    ['Achieved', data.goals.filter((g) => g.status === 'achieved')],
    ['Archived', data.goals.filter((g) => g.status === 'archived' || g.status === 'abandoned')],
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Goals</h1><p>Where you’re going, why, and what done looks like.</p></div>
        <div className="page-head-actions"><button className="btn btn-primary" onClick={() => editors.goal()} type="button"><Icon className="icon-sm" name="plus" />New goal</button></div>
      </header>
      {active.length > 3 && <Banner icon="alert" title={`You have ${active.length} active goals.`} tone="warning">Progress is usually steadier with 1 to 3. Consider pausing the ones you aren’t working on this month.</Banner>}
      {active.length
        ? (
          <section aria-labelledby="ga-h" className="section">
            <div className="section-head"><h2 id="ga-h">Active <span className="count">{active.length}</span></h2><span className="section-meta">{active.length <= 3 ? 'Within the recommended focus of 1 to 3' : ''}</span></div>
            <div className="goal-list">{active.map((g) => <GoalCard goal={g} key={g.id} today={today} />)}</div>
          </section>
        )
        : <Empty action={() => editors.goal()} actionLabel="New goal" body="A goal is a destination: where you’re going and why. Start with one." title="No active goals" />}
      {groups.map(([label, list]) => list.length > 0 && (
        <details className="section-details" key={label}>
          <summary><h2>{label} <span className="count">{list.length}</span></h2></summary>
          <div className="rows">
            {list.map((g) => {
              const progress = goalProgress(g)
              return (
                <div className="row row-link" key={g.id}>
                  <div className="row-main">
                    <button className="row-open" onClick={() => navigate(`#/goals/${g.id}`)} type="button">{g.name}</button>
                    <div className="row-meta"><span>{progress.measured ? `${progress.done} of ${progress.total} criteria met` : 'No success criteria'}</span>{g.completedAt && <span><Icon name="check" />Achieved {D.short(D.ymdOf(g.completedAt))}</span>}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}

function GoalCard({ goal: g, today }: { goal: Goal; today: string }) {
  const { data } = useHop()
  const progress = goalProgress(g)
  const health = goalHealth(g, data.tasks, today)
  const nextTask = sortTasks(data.tasks.filter((t) => t.goalId === g.id && isOpen(t)))[0]
  const daysLeft = g.targetDate ? D.diffDays(g.targetDate, today) : 0
  return (
    <article className="goal-card row-link">
      <div className="goal-card-head">
        <div className="goal-card-title">
          {g.area && <span className="faint xs">{g.area}</span>}
          <h3><button className="row-open" onClick={() => navigate(`#/goals/${g.id}`)} type="button">{g.name}</button></h3>
        </div>
        <Badge icon={health.icon} tone={health.tone}>{health.label}</Badge>
      </div>
      {g.why && <p className="small muted goal-why">{g.why}</p>}
      <div className="goal-progress">
        <ProgressBar label={`${g.name} progress`} pct={progress.pct} />
        {progress.measured
          ? <span className="small"><b className="num">{progress.pct}%</b> <span className="muted">{progress.done} of {progress.total} criteria met</span></span>
          : <span className="small"><b style={{ color: 'var(--warning)' }}>Not measured yet.</b> <span className="muted">Add a success criterion to track progress.</span></span>}
      </div>
      <div className="goal-foot small">
        <span className="muted"><Icon className="icon-sm" name="flag" />{g.targetDate ? <>Target {D.monthYear(g.targetDate)}{daysLeft > 0 ? `, ${daysLeft} days left` : ''}</> : 'No target date'}</span>
        {nextTask ? <span className="goal-next"><span className="muted">Next:</span> {nextTask.title}</span> : <span style={{ color: 'var(--warning)', fontWeight: 700 }}>No next action yet</span>}
      </div>
    </article>
  )
}

function GoalDetail({ id }: { id: string }) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const confirm = useConfirm()
  const g = data.goals.find((x) => x.id === id)
  if (!g) {
    return <div className="page"><Empty body={<>It may have been deleted on another device. <a href="#/goals">Back to goals</a>.</>} icon="alert" pad={false} title="This goal doesn’t exist anymore" /></div>
  }
  const today = D.today()
  const progress = goalProgress(g)
  const health = goalHealth(g, data.tasks, today)
  const open = sortTasks(data.tasks.filter((t) => t.goalId === g.id && isOpen(t)))
  const doneCount = data.tasks.filter((t) => t.goalId === g.id && t.status === 'completed').length
  const habits = data.habits.filter((h) => h.goalId === g.id)
  const projects = data.projects.filter((p) => p.goalIds.includes(g.id))
  const skillIds = new Set(projects.flatMap((p) => p.skillIds))
  const skills = data.skills.filter((k) => skillIds.has(k.id))
  const evidence = data.evidence.filter((e) => e.goalId === g.id).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const milestones = data.milestones.filter((m) => m.goalId === g.id).sort((a, b) => a.date.localeCompare(b.date))
  const baseline = goalBaseline(g, today)
  const delta = baseline ? progress.pct - baseline.progress : null
  const allMet = progress.done === progress.total && progress.total > 0 && g.status === 'active'

  async function achieve() {
    const ok = await confirm({ title: 'Mark this goal achieved?', body: `“${g!.name}” will move to Achieved. Its criteria, tasks and evidence stay in your history.`, confirmLabel: 'Mark achieved' })
    if (ok && await actions.goals.setStatus(g!, 'achieved', 'Goal achieved')) celebrate()
  }

  async function archive() {
    const ok = await confirm({ title: 'Archive this goal?', body: `“${g!.name}” leaves your active goals and Today. Nothing is deleted; you can restore it from the Archived list.`, confirmLabel: 'Archive goal', tone: 'danger' })
    if (ok && await actions.goals.setStatus(g!, 'archived', 'Goal archived')) navigate('#/goals')
  }

  return (
    <div className="page">
      <header className="page-head detail-head">
        <div className="page-head-text">
          <div className="detail-kicker">{g.area && <Badge>{g.area}</Badge>}<Badge icon={health.icon} tone={health.tone}>{health.label}</Badge></div>
          <h1 tabIndex={-1}>{g.name}</h1>
          {g.why && <p>{g.why}</p>}
        </div>
        <div className="page-head-actions">
          <Menu items={[
            { label: 'Edit goal', icon: 'edit', onSelect: () => editors.goal(g) },
            g.status === 'paused' || g.status === 'archived' || g.status === 'achieved'
              ? { label: 'Resume goal', icon: 'play', onSelect: () => void actions.goals.setStatus(g, 'active', 'Goal resumed') }
              : { label: 'Pause goal', icon: 'pause', onSelect: () => void actions.goals.setStatus(g, 'paused', 'Goal paused') },
            ...(g.status === 'achieved' ? [] : [{ label: 'Mark achieved', icon: 'award', onSelect: () => void achieve() }]),
            '-',
            ...(g.status === 'archived' ? [] : [{ label: 'Archive goal', icon: 'archive', onSelect: () => void archive(), danger: true }]),
          ]} label="Goal actions" />
        </div>
      </header>

      {g.status === 'paused' && <Banner action={<button className="btn btn-sm" onClick={() => void actions.goals.setStatus(g, 'active', 'Goal resumed')} type="button">Resume</button>} icon="pause" title="This goal is paused." tone="info">It stays out of Today and won’t be flagged as quiet. Resume it when you’re ready.</Banner>}
      {!progress.measured && <Banner action={<button className="btn btn-primary btn-sm" onClick={() => document.getElementById('crit-add')?.focus()} type="button">Add a criterion</button>} icon="target" title="This goal isn’t measured yet." tone="warning">Progress is the share of success criteria that are true. Add at least one: something you’ll be able to say is done, like “3 serious AI projects”.</Banner>}
      {allMet && <Banner action={<button className="btn btn-primary btn-sm" onClick={() => void achieve()} type="button">Mark achieved</button>} icon="award" title="Every success criterion is met." tone="success">If this feels done, mark it achieved. Its history and evidence are kept.</Banner>}

      <div className="split">
        <div className="stack">
          <section aria-labelledby="gp-h" className="panel panel-pad progress-panel">
            <h2 className="visually-hidden" id="gp-h">Progress</h2>
            <div className="progress-figure">
              <span className="big-num num">{progress.measured ? <>{progress.pct}<small>%</small></> : '–'}</span>
              <div>
                <p>{progress.measured ? <><strong>{progress.done} of {progress.total}</strong> success criteria met</> : <strong>No success criteria yet</strong>}</p>
                <p className="small muted">{delta === null || !baseline ? 'Progress is tracked from today.' : delta > 0 ? `Up ${delta} points since ${D.short(baseline.date)}` : delta === 0 ? `No change since ${D.short(baseline.date)}` : `Down ${-delta} points since ${D.short(baseline.date)}`}</p>
              </div>
            </div>
            <ProgressBar label="Goal progress" pct={progress.pct} />
          </section>

          <section aria-labelledby="gc-h" className="section">
            <div className="section-head"><h2 id="gc-h">Success criteria</h2><span className="section-meta">Tick one off when it’s genuinely true</span></div>
            <div className="rows">
              {g.criteria.map((c) => (
                <div className="row" key={c.id}>
                  <button aria-checked={c.done} aria-label={c.text} className="check check-square" onClick={() => void actions.goals.toggleCriterion(g, c)} role="checkbox" type="button"><Icon name="check" /></button>
                  <div className="row-main"><span className="row-title" style={c.done ? { color: 'var(--text-muted)' } : undefined}>{c.text}</span>{c.note && <span className="row-meta">{c.note}</span>}</div>
                </div>
              ))}
              <InlineAdd id="crit-add" label="Add a success criterion" maxLength={160} onAdd={(text) => actions.goals.addCriterion(g, text)} placeholder="Add a success criterion" />
            </div>
          </section>

          <section aria-labelledby="gt-h" className="section">
            <div className="section-head"><h2 id="gt-h">Next actions <span className="count">{open.length}</span></h2><span className="section-meta">{doneCount} done so far</span></div>
            {open.length
              ? <div className="rows">{open.map((t) => <TaskRow hideGoal key={t.id} showDate task={t} />)}</div>
              : <Banner icon="alert" title="No next action." tone="warning">Goals move through small tasks. Add the next one below.</Banner>}
            <InlineAdd id="gtask-add" label="Add a task for this goal" onAdd={(title) => actions.tasks.add({ title, goalId: g.id }, 'Task added to this goal')} placeholder="Add a task for this goal" />
          </section>

          <section aria-labelledby="gm-h" className="section">
            <div className="section-head"><h2 id="gm-h">Milestones</h2><button className="link-btn small" onClick={() => editors.milestone(g.id)} type="button">Add</button></div>
            {milestones.length
              ? (
                <ol className="timeline">
                  {milestones.map((m) => (
                    <li className={`tl-item${m.done ? ' is-done' : ''}`} key={m.id}>
                      <span aria-hidden="true" className="tl-dot">{m.done && <Icon name="check" />}</span>
                      <div className="tl-body">
                        <span className="tl-title">{m.title}</span>
                        <span className="xs muted">{m.done ? 'Reached' : 'Target'} {D.short(m.date)}{!m.done && m.date < today ? ' (past target)' : ''}</span>
                      </div>
                      {!m.done && <button className="btn btn-sm btn-ghost" onClick={() => void actions.milestones.reach(m)} type="button">Mark reached</button>}
                    </li>
                  ))}
                </ol>
              )
              : <p className="small muted">Dated checkpoints on the way, such as “ML fundamentals done”.</p>}
          </section>
        </div>

        <aside className="stack">
          <section className="panel panel-pad">
            <dl className="facts">
              <div><dt>Target</dt><dd>{g.targetDate ? <>{D.long(g.targetDate)}<span className="muted small">{D.diffDays(g.targetDate, today) > 0 ? `, in ${D.diffDays(g.targetDate, today)} days` : ''}</span></> : <span className="muted">Not set</span>}</dd></div>
              <div><dt>Started</dt><dd>{D.short(g.startDate ?? D.ymdOf(g.createdAt))}</dd></div>
              <div><dt>Priority</dt><dd>{capitalize(g.priority)}</dd></div>
            </dl>
          </section>
          <section aria-labelledby="gh-h" className="section">
            <div className="section-head"><h2 id="gh-h">Habits</h2></div>
            {habits.length
              ? <div className="rows rows-compact">{habits.map((h) => <HabitRow habit={h} hideGoal key={h.id} />)}</div>
              : <p className="small muted">No habits support this goal. <button className="link-btn" onClick={() => editors.habit()} type="button">Add a habit</button></p>}
          </section>
          <section aria-labelledby="gpj-h" className="section">
            <div className="section-head"><h2 id="gpj-h">Projects and skills</h2></div>
            {projects.length
              ? <ul className="link-list">{projects.map((p) => <li key={p.id}><a href={`#/growth/projects?project=${p.id}`}><Icon className="icon-sm" name="code" />{p.name}</a><Badge tone={p.status === 'deployed' ? 'success' : 'primary'}>{capitalize(p.status)}</Badge></li>)}</ul>
              : <p className="small muted">No linked projects yet.</p>}
            {skills.length > 0 && <div className="tag-list">{skills.map((k) => <a className="tag" href={`#/growth/skills?skill=${k.id}`} key={k.id}>{k.name}</a>)}</div>}
          </section>
          <section aria-labelledby="ge-h" className="section">
            <div className="section-head"><h2 id="ge-h">Evidence</h2><button className="link-btn small" onClick={() => editors.evidence({ goalId: g.id })} type="button">Add</button></div>
            {evidence.length
              ? <ul className="evidence-mini">{evidence.map((e) => <li key={e.id}><span>{e.title}</span><span className="xs muted">{e.date ? D.short(e.date) : ''}</span></li>)}</ul>
              : <p className="small muted">Proof that this goal is moving: something shipped, passed or completed.</p>}
          </section>
        </aside>
      </div>
    </div>
  )
}
