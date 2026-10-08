// Calendar: Hop's own data laid out by day. A month or week at a glance (events, tasks open and
// done, application deadlines, opportunity steps, milestones), and the chosen day in full beside
// it, with that day's habits. Routes: #/calendar[/month|week[/YYYY-MM-DD]].
import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import * as D from '../lib/dates.ts'
import { agendaItems, habitDone, habitDue } from '../lib/rules.ts'
import type { AgendaItem } from '../lib/rules.ts'
import type { Route } from '../lib/router.ts'
import { navigate } from '../lib/router.ts'
import { AGENDA_META } from '../lib/labels.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { AgendaRow, HabitRow, TaskRow } from '../components/rows.tsx'
import { Empty, Segmented } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'

type View = 'month' | 'week'

const isDate = (value: string | undefined): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)))
const href = (view: View, date: string) => `#/calendar/${view}/${date}`

/** Completions are loaded for the last four weeks, so older days can't say whether a habit was done. */
const HABIT_HISTORY_DAYS = 27

function entryTone(item: AgendaItem) {
  if (item.kind === 'task') return item.ref.status === 'completed' ? 'done' : 'task'
  return AGENDA_META[item.type]?.[2] || 'event'
}

function entryText(item: AgendaItem) {
  return item.time ? `${item.time} ${item.title}` : item.title
}

export function Calendar({ route }: { route: Route }) {
  const { data, ui, setUi } = useHop()
  const editors = useEditors()
  const today = D.today()
  const view: View = route.params[0] === 'week' ? 'week' : 'month'
  const selected = isDate(route.params[1]) ? route.params[1] : today
  const weekStart = data.settings.weekStart
  const filter = ui.agendaFilter

  // The visible range: whole weeks covering the month, or the one week.
  const first = view === 'month' ? D.startOfWeek(D.startOfMonth(selected), weekStart) : D.startOfWeek(selected, weekStart)
  const monthEnd = D.addDays(D.addMonths(D.startOfMonth(selected), 1), -1)
  const weeks = view === 'month' ? Math.ceil((D.diffDays(monthEnd, first) + 1) / 7) : 1
  const last = D.addDays(first, weeks * 7 - 1)
  const days = Array.from({ length: weeks * 7 }, (_, i) => D.addDays(first, i))

  const byDay = new Map<string, AgendaItem[]>()
  for (const item of agendaItems(data, first, last, { includeDone: true })) {
    if (filter === 'tasks' && item.kind !== 'task') continue
    if (filter === 'dated' && item.kind === 'task') continue
    byDay.set(item.date, [...(byDay.get(item.date) ?? []), item])
  }

  const step = (direction: number) => {
    const next = view === 'month' ? D.addMonths(selected, direction) : D.addDays(selected, direction * 7)
    navigate(href(view, next))
  }
  const title = view === 'month'
    ? D.monthLong(selected)
    : `${D.short(first)} – ${D.short(last)} ${last.slice(0, 4)}`
  const chip = (key: string, label: string) => <button aria-pressed={filter === key} className="chip" onClick={() => setUi({ agendaFilter: key })} type="button">{label}</button>

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Calendar</h1><p>Your events, tasks, deadlines and milestones, day by day.</p></div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => editors.event(selected)} type="button"><Icon className="icon-sm" name="calendar" />New event</button>
          <button className="btn btn-primary" onClick={() => editors.task(null, { scheduledDate: selected })} type="button"><Icon className="icon-sm" name="plus" />New task</button>
        </div>
      </header>

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button aria-label={view === 'month' ? 'Previous month' : 'Previous week'} className="icon-btn" onClick={() => step(-1)} type="button"><Icon name="back" /></button>
          <button aria-label={view === 'month' ? 'Next month' : 'Next week'} className="icon-btn" onClick={() => step(1)} type="button"><Icon name="chevron" /></button>
          <h2 aria-live="polite" className="cal-title">{title}</h2>
          {(selected !== today || !days.includes(today)) && <button className="btn btn-sm" onClick={() => navigate(href(view, today))} type="button">Today</button>}
        </div>
        <Segmented label={<span className="visually-hidden">View</span>} name="cal-view" onChange={(value) => navigate(href(value as View, selected))} options={[['month', 'Month'], ['week', 'Week']]} small value={view} />
      </div>
      <div aria-label="Show" className="chips" role="group">{chip('all', 'Everything')}{chip('dated', 'Events and deadlines')}{chip('tasks', 'Tasks')}</div>

      <div className="cal-layout">
        <CalendarGrid byDay={byDay} days={days} month={view === 'month' ? selected.slice(0, 7) : null} onSelect={(date) => navigate(href(view, date))} selected={selected} today={today} />
        <DayPanel date={selected} items={byDay.get(selected) ?? []} today={today} />
      </div>
    </div>
  )
}

function CalendarGrid({ days, byDay, selected, today, month, onSelect }: {
  days: string[]
  byDay: Map<string, AgendaItem[]>
  selected: string
  today: string
  /** YYYY-MM for the month view, so days from the neighbouring months are dimmed. */
  month: string | null
  onSelect: (date: string) => void
}) {
  const grid = useRef<HTMLDivElement>(null)
  const week = !month
  const limit = week ? 8 : 3

  // Keep keyboard focus on the selected day after arrow keys move it.
  const focusSelected = useRef(false)
  useEffect(() => {
    if (!focusSelected.current) return
    focusSelected.current = false
    grid.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
  }, [selected])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const by = moves[event.key]
    if (by === undefined || !(event.target as HTMLElement).matches('.cal-day')) return
    event.preventDefault()
    focusSelected.current = true
    onSelect(D.addDays(selected, by))
  }

  return (
    <div className={`cal${week ? ' cal-week' : ''}`} onKeyDown={onKeyDown} ref={grid}>
      <div aria-hidden="true" className="cal-head">{days.slice(0, 7).map((d) => <span key={d}>{D.DAYS[D.weekday(d)]}</span>)}</div>
      <div aria-label="Days" className="cal-grid" role="listbox">
        {days.map((date) => {
          const items = byDay.get(date) ?? []
          const outside = month !== null && !date.startsWith(month)
          const label = `${D.long(date)}${date === today ? ', today' : ''}: ${items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : 'nothing scheduled'}`
          return (
            <button
              aria-label={label}
              aria-selected={date === selected}
              className={`cal-day${outside ? ' is-outside' : ''}${date === today ? ' is-today' : ''}${date < today ? ' is-past' : ''}`}
              key={date}
              onClick={() => onSelect(date)}
              role="option"
              tabIndex={date === selected ? 0 : -1}
              type="button"
            >
              <span className="cal-date num">{D.dayOfMonth(date)}</span>
              <span aria-hidden="true" className="cal-entries">
                {items.slice(0, limit).map((item, index) => <span className={`cal-entry tone-${entryTone(item)}`} key={index}>{entryText(item)}</span>)}
                {items.length > limit && <span className="cal-more">+{items.length - limit} more</span>}
              </span>
              <span aria-hidden="true" className="cal-dots">{items.slice(0, 4).map((item, index) => <i className={`tone-${entryTone(item)}`} key={index} />)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayPanel({ date, items, today }: { date: string; items: AgendaItem[]; today: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const habits = data.habits.filter((h) => habitDue(h, date))
  const n = D.diffDays(date, today)
  const heading = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : D.long(date)
  const open = items.filter((item) => item.kind !== 'task' || item.ref.status !== 'completed')
  const done = items.filter((item) => item.kind === 'task' && item.ref.status === 'completed')
  const row = (item: AgendaItem) => (item.kind === 'task' ? <TaskRow key={item.ref.id} task={item.ref} /> : <AgendaRow item={item} key={`${item.kind}-${item.ref.id}-${item.date}`} />)

  return (
    <aside aria-labelledby="cal-day-h" className="cal-panel panel panel-pad">
      <div className="section-head">
        <h2 id="cal-day-h">{heading} {Math.abs(n) <= 1 && <span className="faint small">{D.withDay(date)}</span>}</h2>
        <button aria-label={`Add a task on ${D.long(date)}`} className="icon-btn" data-tip="Add a task" onClick={() => editors.task(null, { scheduledDate: date })} type="button"><Icon name="plus" /></button>
      </div>
      {open.length > 0 && <div className="rows">{open.map(row)}</div>}
      {done.length > 0 && <section aria-label="Done" className="cal-panel-group"><h3 className="xs muted cal-panel-label">Done</h3><div className="rows">{done.map(row)}</div></section>}
      {!items.length && <Empty action={() => editors.task(null, { scheduledDate: date })} actionLabel="Add a task" body={n < 0 ? 'Nothing was scheduled or finished on this day.' : 'Tasks, events, deadlines and milestones on this day appear here.'} icon="calendar" pad={false} title="Nothing on this day" />}
      {habits.length > 0 && (
        <section aria-label="Habits" className="cal-panel-group">
          <h3 className="xs muted cal-panel-label">Habits</h3>
          {date === today
            ? <div className="rows">{habits.map((h) => <HabitRow habit={h} key={h.id} />)}</div>
            : (
              <ul className="cal-habits">
                {habits.map((h) => {
                  const known = n < 0 && -n <= HABIT_HISTORY_DAYS
                  const hit = known && habitDone(h, data.completions, date)
                  return (
                    <li key={h.id}>
                      <Icon className={`icon-sm${hit ? ' is-done' : ''}`} name={n > 0 ? 'clock' : hit ? 'check' : known ? 'x' : 'clock'} />
                      <span>{h.name}</span>
                      <span className="xs muted">{n > 0 ? `${h.minutes} min` : hit ? 'Done' : known ? 'Not done' : 'Scheduled'}</span>
                    </li>
                  )
                })}
              </ul>
            )}
        </section>
      )}
    </aside>
  )
}
