// The workhorse list items shared across screens.
import { useState } from 'react'
import type { ReactNode } from 'react'
import * as D from '../lib/dates.ts'
import { slotsLabel, slotsOn } from '../lib/schedule.ts'
import { STAGE_LABEL, STAGES, agendaHref, agendaLabel, daysLabel, habitAmount, habitDue, habitState, habitUnits, habitWeek, isRepeating, targetOn, workBetween, isClosed, nextEvent, oppHealth, orgOf, placeOf, rank } from '../lib/rules.ts'
import type { AgendaItem, AttentionItem, WorkState } from '../lib/rules.ts'
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

  // A repeating task is a series: it's ticked per occurrence (Calendar, Your day), never from here.
  if (isRepeating(task)) {
    const weekStart = D.startOfWeek(today, data.settings.weekStart)
    const week = workBetween(data, weekStart, D.addDays(weekStart, 6), today).filter((o) => o.task.id === task.id)
    const sofar = week.filter((o) => o.state !== 'open')
    return (
      <div className={`row row-link${task.status === 'completed' ? ' is-done' : ''}`}>
        <span aria-hidden="true" className="type-tile"><Icon name="refresh" /></span>
        <div className="row-main">
          <button className="row-open" onClick={() => editors.task(task)} type="button">{task.title}</button>
          <div className="row-meta">
            <span className="num">{slotsLabel(task.repeat!)}</span>
            {task.status === 'completed' ? <span><Icon name="check" />Finished</span> : sofar.length > 0 && <span className="num">{sofar.filter((o) => o.state === 'done').length} of {sofar.length} done this week</span>}
            {goal && !hideGoal && <span><Icon name="goals" />{goal.name}</span>}
          </div>
        </div>
        {menu && (
          <div className="row-actions">
            <Menu items={[
              { label: 'Edit', icon: 'edit', onSelect: () => editors.task(task) },
              task.status === 'completed'
                ? { label: 'Start again', icon: 'refresh', onSelect: () => void actions.tasks.toggle(task) }
                : { label: 'Finish the series', icon: 'check', onSelect: () => void actions.tasks.toggle(task) },
              '-',
              { label: 'Delete task', icon: 'trash', onSelect: () => void actions.tasks.remove(task), danger: true },
            ]} label={`More actions for ${task.title}`} />
          </div>
        )}
      </div>
    )
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

/** "5 of 10 pages", "45 min of 1 h"; just "10 pages" when it's exactly the target. */
const amountOf = (habit: Habit, amount: number, target: number) =>
  amount === target ? habitUnits(habit, amount) : habit.unit === 'minutes' ? `${D.minutes(amount)} of ${D.minutes(target)}` : `${amount} of ${habitUnits(habit, target)}`
const DAY_STATE: Record<string, string> = { done: 'done', minimum: 'minimum kept', some: 'some done', none: 'not done' }

export function HabitRow({ habit, hideGoal, manage }: { habit: Habit; hideGoal?: boolean; manage?: boolean }) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const today = D.today()
  const state = habitState(habit, data.completions, today)
  const amount = habitAmount(habit, data.completions, today)
  const due = habitDue(habit, today)
  const week = habitWeek(habit, data.completions, today)
  const goal = data.goals.find((g) => g.id === habit.goalId)
  const logged = state !== 'none'
  const target = targetOn(habit, today)
  const times = slotsOn(habit.slots, today).map((slot) => `${slot.start}–${slot.end}`).join(', ')
  // A minimum equal to the target (a whole hizb) says nothing new.
  const minimum = habit.minimum !== null && habit.minimum < target ? ` · minimum ${habitUnits(habit, habit.minimum)}` : ''
  const howMuch = state === 'none' ? `${habitUnits(habit, target)}${minimum}` : state === 'done' ? `Done · ${amountOf(habit, amount, target)}` : `${amountOf(habit, amount, target)}${state === 'minimum' ? ' · minimum kept' : ''}`

  return (
    <div className={`row habit-row${state === 'done' ? ' is-done-habit' : ''}`}>
      {/* One tap logs the whole target or undoes the day; the amount next to the name logs part of it. */}
      {due
        ? <button aria-checked={state === 'done' ? true : logged ? 'mixed' : false} aria-label={`${logged ? 'Undo' : 'Mark done'}: ${habit.name} today`} className="check" onClick={() => void actions.habits.toggle(habit)} role="checkbox" type="button"><Icon name="check" /></button>
        : <span aria-hidden="true" className="check" style={{ opacity: 0.35 }} />}
      <div className="row-main">
        <span className="row-title">{times && <span className="habit-time num">{times}</span>}{habit.name}</span>
        <div className="row-meta">
          {due
            ? <button aria-label={`Log how much: ${habit.name}. ${howMuch}`} className="habit-amount" onClick={() => editors.logHabit(habit)} type="button">{howMuch}</button>
            : <span>{habitUnits(habit, target)}</span>}
          <span>{habit.slots.length ? slotsLabel(habit.slots) : daysLabel(habit.days)}</span>
          {goal && !hideGoal && <span className="habit-goal"><Icon name="goals" />{goal.name}</span>}
          {!due && <span>Not scheduled today</span>}
        </div>
      </div>
      <div className="habit-consistency">
        <span aria-label={`Last 7 days: ${week.days.filter((d) => d.state === 'done' || d.state === 'minimum').length} of ${week.days.filter((d) => d.due).length} scheduled days kept`} className="habit-strip">
          {week.days.map((day) => (
            <span className="habit-day" key={day.date} title={`${D.withDay(day.date)}: ${day.due || day.state !== 'none' ? DAY_STATE[day.state] : 'not scheduled'}`}>
              <i className={`${day.state === 'done' ? 'on' : day.state !== 'none' ? 'part' : day.due ? 'miss' : 'off'}${day.isToday ? ' today' : ''}`} />
              <b aria-hidden="true" className={day.isToday ? 'is-today' : undefined}>{D.DAYS[D.weekday(day.date)]![0]}</b>
            </span>
          ))}
        </span>
        <span className="xs muted num" title={week.scheduled ? `${week.rate}% of scheduled days in the last 4 weeks${week.minimum ? `, ${week.minimum} of them at the minimum` : ''}` : undefined}>
          {week.scheduled ? `${week.done} of ${week.scheduled} days kept` : 'New: no full day yet'}
        </span>
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
/**
 * One occurrence of repeating work: tick it done, skip it ("no Veribir tasks today"), or see that
 * it was missed. Missed is history, never overdue.
 */
export function WorkRow({ task, date, start, end, state }: { task: Task; date: string; start: string; end: string; state: WorkState }) {
  const actions = useActions()
  const editors = useEditors()
  const done = state === 'done'
  return (
    <div className={`row row-link work-row${done ? ' is-done' : ''}${state === 'skipped' ? ' is-skipped' : ''}`}>
      <button aria-checked={done} aria-label={`${done ? 'Mark as not done' : 'Done'}: ${task.title}, ${D.withDay(date)}`} className="check" onClick={() => void (done ? actions.work.untick(task, date) : actions.work.tick(task, date))} role="checkbox" type="button"><Icon name="check" /></button>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.task(task)} type="button">{task.title}</button>
        <div className="row-meta">
          <span className="num">{start}–{end}</span>
          {state === 'skipped' && <span>Skipped</span>}
          {state === 'missed' && <span className="work-missed">Missed</span>}
        </div>
      </div>
      <div className="row-actions">
        {state === 'skipped'
          ? <button className="btn btn-sm btn-ghost" onClick={() => void actions.work.untick(task, date)} type="button">Undo skip</button>
          : !done && <button className="btn btn-sm btn-ghost" onClick={() => void actions.work.tick(task, date, true)} type="button">Skip</button>}
      </div>
    </div>
  )
}

export function AgendaRow({ item }: { item: AgendaItem }) {
  const editors = useEditors()
  const [icon, , tone] = AGENDA_META[item.type] ?? AGENDA_META.event!
  const href = agendaHref(item)
  // An event of your own opens for editing; one tied to an opportunity or a review goes there.
  const open = href ? () => navigate(href) : item.kind === 'event' ? () => editors.editEvent(item.ref, item.date) : null
  return (
    <div className={`row${open ? ' row-link' : ''} agenda-item`}>
      <span className="agenda-time num">{item.time ?? <span className="faint">All day</span>}</span>
      <div className="row-main">
        {open ? <button className="row-open" onClick={open} type="button">{item.title}</button> : <span className="row-title">{item.title}</span>}
        {item.kind === 'event' && (item.end || item.ref.repeat) && <span className="row-meta">{[item.end && `${item.time}–${item.end}`, item.ref.repeat && 'Every week'].filter(Boolean).join(' · ')}</span>}
        {item.kind === 'event' && item.ref.description && <span className="row-meta">{item.ref.description}</span>}
        {item.kind === 'class' && <span className="row-meta">{item.time}–{item.end}{item.room ? `, ${item.room}` : ''}</span>}
      </div>
      <Badge icon={icon} tone={tone}>{agendaLabel(item)}</Badge>
    </div>
  )
}
