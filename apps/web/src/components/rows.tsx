// The workhorse list items shared across screens.
import { useState } from 'react'
import type { ReactNode } from 'react'
import * as D from '../lib/dates.ts'
import { STAGE_LABEL, STAGES, agendaHref, agendaLabel, daysLabel, habitDone, habitDue, habitWeek, isClosed, nextEvent, oppHealth, orgOf, placeOf, rank } from '../lib/rules.ts'
import type { AgendaItem, AttentionItem } from '../lib/rules.ts'
import type { Habit, Opportunity, Task } from '../lib/types.ts'
import { navigate } from '../lib/router.ts'
import { useActions } from '../store/actions.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from './Icon.tsx'
import { Badge, Menu } from './ui.tsx'
import { useHop } from '../store/store.ts'
import { useToast } from './ui-context.ts'
import { AGENDA_META } from '../lib/labels.ts'

type TaskRowOptions = { showMust?: boolean; showDate?: boolean; hideGoal?: boolean; menu?: boolean }

export function TaskRow({ task, showMust, showDate, hideGoal, menu = true }: { task: Task } & TaskRowOptions) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const [justDone, setJustDone] = useState(false)
  const today = D.today()
  const done = task.status === 'completed' || justDone
  const goal = data.goals.find((g) => g.id === task.goalId)
  const opportunity = data.opportunities.find((o) => o.id === task.opportunityId)
  const project = data.projects.find((p) => p.id === task.projectId)
  const meta: ReactNode[] = []

  if (showMust) meta.push(<span className="prio prio-must" key="must"><Icon className="icon-sm" name="flag" />Must</span>)
  if (task.status !== 'completed' && task.dueDate) {
    const overdue = task.dueDate < today
    const soon = !overdue && D.diffDays(task.dueDate, today) <= 1
    meta.push(<span key="due" style={overdue ? { color: 'var(--danger)', fontWeight: 700 } : soon ? { color: 'var(--warning)', fontWeight: 700 } : undefined}><Icon name="clock" />{D.dueLabel(task.dueDate, today)}</span>)
  } else if (task.status !== 'completed' && task.scheduledDate && showDate) {
    meta.push(<span key="date"><Icon name="calendar" />{D.relative(task.scheduledDate, today)}</span>)
  }
  if (task.status === 'completed' && task.completedAt) meta.push(<span key="done"><Icon name="check" />Done {D.relative(D.ymdOf(task.completedAt), today).toLowerCase()}</span>)
  if (opportunity) meta.push(<span key="opp"><Icon name="career" />{orgOf(opportunity)}</span>)
  else if (project) meta.push(<span key="project"><Icon name="code" />{project.name}</span>)
  const course = task.courseId ? data.courses.find((c) => c.id === task.courseId) : undefined
  if (course) meta.push(<span key="course"><Icon name="school" />{course.code}</span>)
  if (goal && !hideGoal) meta.push(<span key="goal"><Icon name="goals" />{goal.name}</span>)
  if (task.estimatedMinutes && task.status !== 'completed') meta.push(<span key="estimate">{D.minutes(task.estimatedMinutes)}</span>)

  async function toggle() {
    if (task.status !== 'completed') setJustDone(true)
    const saved = await actions.tasks.toggle(task)
    if (!saved) setJustDone(false)
  }

  return (
    <div className={`row row-link${task.status === 'completed' ? ' is-done' : ''}`}>
      <button aria-checked={done} aria-label={`${task.status === 'completed' ? 'Mark as not done' : 'Complete'}: ${task.title}`} className={`check${justDone ? ' just-done' : ''}`} onClick={() => void toggle()} role="checkbox" type="button"><Icon name="check" /></button>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.task(task)} type="button">{task.title}</button>
        {meta.length > 0 && <div className="row-meta">{meta}</div>}
      </div>
      {menu && (
        <div className="row-actions">
          <Menu items={[
            ...(task.status === 'completed' ? [] : task.scheduledDate === today
              ? [{ label: 'Move to tomorrow', icon: 'arrowRight', onSelect: () => void actions.tasks.moveTo(task, D.addDays(today, 1), 'Moved to tomorrow') }]
              : [{ label: 'Do today', icon: 'today', onSelect: () => void actions.tasks.moveTo(task, today, 'Moved to today') }]),
            { label: 'Edit', icon: 'edit', onSelect: () => editors.task(task) },
            '-',
            { label: 'Delete task', icon: 'trash', onSelect: () => void actions.tasks.remove(task), danger: true },
          ]} label={`More actions for ${task.title}`} />
        </div>
      )}
    </div>
  )
}

export function HabitRow({ habit, hideGoal, manage }: { habit: Habit; hideGoal?: boolean; manage?: boolean }) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const today = D.today()
  const done = habitDone(habit, data.completions, today)
  const due = habitDue(habit, today)
  const week = habitWeek(habit, data.completions, today)
  const goal = data.goals.find((g) => g.id === habit.goalId)

  return (
    <div className={`row habit-row${done ? ' is-done-habit' : ''}`}>
      {due
        ? <button aria-checked={done} aria-label={`${done ? 'Undo' : 'Mark done'}: ${habit.name} today`} className="check" onClick={() => void actions.habits.toggle(habit)} role="checkbox" type="button"><Icon name="check" /></button>
        : <span aria-hidden="true" className="check" style={{ opacity: 0.35 }} />}
      <div className="row-main">
        <span className="row-title">{habit.name}</span>
        <div className="row-meta">
          <span>{daysLabel(habit.days)}</span>
          {goal && !hideGoal && <span><Icon name="goals" />{goal.name}</span>}
          {!due && <span>Not scheduled today</span>}
        </div>
      </div>
      <div className="habit-consistency">
        <span aria-label={`Last 7 days: ${week.days.filter((d) => d.done).length} of ${week.days.filter((d) => d.due).length} scheduled days done`} className="habit-strip">
          {week.days.map((day) => <i className={`${day.done ? 'on' : day.due ? 'miss' : 'off'}${day.isToday ? ' today' : ''}`} key={day.date} title={`${D.withDay(day.date)}: ${day.done ? 'done' : day.due ? 'not done' : 'not scheduled'}`} />)}
        </span>
        <span className="xs muted num">{week.rate}% of the last 4 weeks</span>
      </div>
      {manage && (
        <div className="row-actions">
          <Menu items={[
            { label: 'Edit habit', icon: 'edit', onSelect: () => editors.habit(habit) },
            { label: habit.active ? 'Pause habit' : 'Resume habit', icon: habit.active ? 'pause' : 'play', onSelect: () => void actions.habits.setActive(habit, !habit.active) },
          ]} label={`More actions for ${habit.name}`} />
        </div>
      )}
    </div>
  )
}

function StageTrack({ opportunity }: { opportunity: Opportunity }) {
  const closed = isClosed(opportunity)
  const current = rank(closed ? opportunity.reachedStage ?? 'applied' : opportunity.stage)
  return (
    <span aria-label={`Stage ${current + 1} of ${STAGES.length}: ${STAGE_LABEL[opportunity.stage]}`} className={`stage-track${closed ? ' closed' : ''}`} role="img">
      {STAGES.map((stage, index) => <i className={index < current ? 'on' : index === current ? 'now' : ''} key={stage} />)}
    </span>
  )
}

export function OrgMark({ name, large }: { name: string; large?: boolean }) {
  const initials = name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  return <span aria-hidden="true" className={`org-mark${large ? ' org-mark-lg' : ''}`}>{initials}</span>
}

export function OppRow({ opportunity: o }: { opportunity: Opportunity }) {
  const { data } = useHop()
  const today = D.today()
  const health = oppHealth(o, today, data.settings.followUpDays)
  const next = nextEvent(o)
  const nextText = next && next.date >= today
    ? `${next.label}, ${D.relative(next.date, today)}${next.time ? ` ${next.time}` : ''}`
    : o.deadline && rank(o.stage) < rank('applied') ? `Deadline ${D.relative(o.deadline, today)}` : ''

  return (
    <div className="row row-link opp-row">
      <OrgMark name={orgOf(o)} />
      <div className="row-main">
        <button className="row-open" onClick={() => navigate(`#/career/${o.id}`)} type="button">{o.title}</button>
        <div className="row-meta">
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{orgOf(o)}</span>
          <span>{placeOf(o)}</span>
          {nextText && <span><Icon name="calendar" />{nextText}</span>}
        </div>
      </div>
      <div className="opp-stage">
        <StageTrack opportunity={o} />
        <span className="xs muted">{STAGE_LABEL[o.stage]}</span>
      </div>
      <div className="opp-health hide-phone">{health.key !== 'closed' && <Badge icon={health.tone === 'warning' || health.tone === 'danger' ? 'alert' : health.tone === 'info' ? 'calendar' : null} tone={health.tone}>{health.label}</Badge>}</div>
    </div>
  )
}

const levelText = { critical: 'Urgent', important: 'Important', info: 'For review' }

export function AttentionList({ items, max }: { items: AttentionItem[]; max?: number }) {
  if (!items.length) {
    return <div className="panel panel-pad attn-clear"><Icon name="check" /><div><strong>Nothing urgent.</strong><p className="small muted">No deadlines, interviews or follow-ups in the next few days.</p></div></div>
  }
  return (
    <div className="rows">
      {(max ? items.slice(0, max) : items).map((item) => (
        <a className={`attn attn-${item.level} attn-link`} href={item.href} key={item.title}>
          <span className="attn-icon"><Icon name={item.icon} /></span>
          <span className="attn-body"><span className="attn-title"><span className="visually-hidden">{levelText[item.level]}: </span>{item.title}</span><span className="attn-detail">{item.detail}</span></span>
          <Icon className="icon-sm attn-chev" name="chevron" />
        </a>
      ))}
    </div>
  )
}

/** An inline "add" form at the end of a list: type, press Enter. */
export function InlineAdd({ id, label, placeholder, onAdd, maxLength = 200, large, primary, emptyMessage }: {
  id: string
  emptyMessage?: string
  label: string
  placeholder: string
  onAdd: (value: string) => Promise<unknown>
  maxLength?: number
  large?: boolean
  primary?: boolean
}) {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const toast = useToast()
  return (
    <form
      className={`inline-add${large ? ' inline-add-lg' : ''}`}
      onSubmit={async (event) => {
        event.preventDefault()
        const input = event.currentTarget.querySelector('input')!
        const title = value.trim()
        if (!title) {
          setInvalid(true)
          input.focus()
          if (emptyMessage) toast(emptyMessage, { type: 'error' })
          return
        }
        setInvalid(false)
        if (await onAdd(title)) { setValue(''); input.focus() }
      }}
    >
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <Icon name="plus" />
      <input aria-invalid={invalid || undefined} autoComplete="off" className="inline-add-input" id={id} maxLength={maxLength} name="title" onChange={(event) => setValue(event.target.value)} placeholder={placeholder} value={value} />
      <button className={`btn ${primary ? 'btn-primary' : 'btn-sm'}`} type="submit">Add</button>
    </form>
  )
}

/* ---- Agenda entries (events, deadlines, milestones) ------------------------------------- */
export function AgendaRow({ item }: { item: AgendaItem }) {
  const [icon, , tone] = AGENDA_META[item.type] ?? AGENDA_META.event!
  const href = agendaHref(item)
  return (
    <div className={`row${href ? ' row-link' : ''} agenda-item`}>
      <span className="agenda-time num">{item.time ?? <span className="faint">All day</span>}</span>
      <div className="row-main">
        {href ? <button className="row-open" onClick={() => navigate(href)} type="button">{item.title}</button> : <span className="row-title">{item.title}</span>}
        {item.kind === 'event' && item.ref.description && <span className="row-meta">{item.ref.description}</span>}
      </div>
      <Badge icon={icon} tone={tone}>{agendaLabel(item)}</Badge>
    </div>
  )
}
