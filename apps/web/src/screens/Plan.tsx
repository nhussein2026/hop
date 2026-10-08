// Plan: everything scheduled, in one place. Agenda first (time), then Tasks (lists), then Habits.
import { useEffect } from 'react'
import * as D from '../lib/dates.ts'
import { agenda, isOpen, isOverdue, sortTasks, todayPlan } from '../lib/rules.ts'
import type { AgendaGroup } from '../lib/rules.ts'
import type { Route } from '../lib/router.ts'
import { navigate } from '../lib/router.ts'
import type { Task } from '../lib/types.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { AgendaRow, HabitRow, TaskRow } from '../components/rows.tsx'
import { Empty, RowFilter, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'

export function Plan({ route }: { route: Route }) {
  const editors = useEditors()
  const tab = route.params[0] || 'agenda'
  const { data } = useHop()
  const taskId = route.query.task

  useEffect(() => {
    if (!taskId) return
    const task = data.tasks.find((t) => t.id === taskId)
    navigate(`#/plan/${tab}`)
    if (task) editors.task(task)
    // Open once per link; the data dependency is only for finding the task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Plan</h1><p>What’s scheduled, what’s due, and what you repeat.</p></div>
        <div className="page-head-actions">
          {tab === 'agenda' && <a className="btn" href="#/calendar"><Icon className="icon-sm" name="calendar" />Calendar</a>}
          {tab === 'habits'
            ? <button className="btn btn-primary" onClick={() => editors.habit()} type="button"><Icon className="icon-sm" name="plus" />New habit</button>
            : <button className="btn btn-primary" onClick={() => editors.task(null, { scheduledDate: D.today() })} type="button"><Icon className="icon-sm" name="plus" />New task</button>}
        </div>
      </header>
      <Tabs active={tab} items={[['agenda', 'Agenda', '#/plan'], ['tasks', 'Tasks', '#/plan/tasks'], ['habits', 'Habits', '#/plan/habits']]} label="Plan sections" />
      {tab === 'tasks' ? <TasksTab /> : tab === 'habits' ? <HabitsTab /> : <AgendaTab />}
    </div>
  )
}

function AgendaTab() {
  const { data, ui, setUi } = useHop()
  const editors = useEditors()
  const today = D.today()
  const filter = ui.agendaFilter
  const overdue = sortTasks(data.tasks.filter((t) => isOverdue(t, today)))
  let groups = agenda(data, today, 13)
  if (filter !== 'all') {
    groups = groups.map((group) => ({ ...group, items: group.items.filter((item) => (filter === 'tasks' ? item.kind === 'task' : item.kind !== 'task')) })).filter((group) => group.items.length)
  }
  const chip = (key: string, label: string) => <button aria-pressed={filter === key} className="chip" onClick={() => setUi({ agendaFilter: key })} type="button">{label}</button>

  return (
    <>
      <div className="toolbar">
        <div aria-label="Show" className="chips" role="group">{chip('all', 'Everything')}{chip('dated', 'Events and deadlines')}{chip('tasks', 'Tasks')}</div>
        <span className="small muted">Next 14 days</span>
      </div>
      {overdue.length > 0 && filter !== 'dated' && (
        <section aria-labelledby="ag-over" className="agenda-day">
          <h2 className="agenda-date" id="ag-over"><span style={{ color: 'var(--danger)' }}>Overdue</span> <span className="count count-attention">{overdue.length}</span></h2>
          <div className="rows">{overdue.map((t) => <TaskRow key={t.id} task={t} />)}</div>
        </section>
      )}
      {groups.length
        ? groups.map((group) => <DayGroup group={group} key={group.date} today={today} />)
        : <Empty action={() => editors.task(null, { scheduledDate: today })} actionLabel="Schedule a task" body="Tasks with a date, interviews, deadlines and milestones all appear here." title="Nothing scheduled in the next two weeks" />}
    </>
  )
}

function DayGroup({ group, today }: { group: AgendaGroup; today: string }) {
  const n = D.diffDays(group.date, today)
  const label = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : D.long(group.date)
  return (
    <section aria-label={label} className="agenda-day">
      <h2 className="agenda-date">{label} {n <= 1 && <span className="faint small">{D.withDay(group.date)}</span>}</h2>
      <div className="rows">{group.items.map((item, index) => (item.kind === 'task' ? <TaskRow key={item.ref.id} task={item.ref} /> : <AgendaRow item={item} key={index} />))}</div>
    </section>
  )
}

const LABELS: Record<string, string> = { today: 'Today', upcoming: 'Upcoming', inbox: 'No date', overdue: 'Overdue', done: 'Done' }
const HINTS: Record<string, string> = {
  today: 'Planned for today, due today, or slipped from earlier days.',
  upcoming: 'Scheduled or due after today.',
  inbox: 'Captured without a date. Give each one a day, or delete it.',
  overdue: 'Past their due date. Finish, reschedule, or let them go.',
  done: 'Completed tasks keep their completion time.',
}

function taskBuckets(tasks: Task[], today: string): Record<string, Task[]> {
  const open = tasks.filter(isOpen)
  const dateOf = (t: Task) => t.scheduledDate || t.dueDate
  return {
    today: todayPlan(tasks, today).all,
    upcoming: sortTasks(open.filter((t) => dateOf(t) && dateOf(t)! > today)).sort((a, b) => dateOf(a)!.localeCompare(dateOf(b)!)),
    inbox: sortTasks(open.filter((t) => !t.scheduledDate && !t.dueDate)),
    overdue: sortTasks(open.filter((t) => isOverdue(t, today))),
    done: tasks.filter((t) => t.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
  }
}

function TasksTab() {
  const { data, ui, setUi } = useHop()
  const editors = useEditors()
  const today = D.today()
  const buckets = taskBuckets(data.tasks, today)
  const filter = ui.taskFilter
  const list = buckets[filter] ?? []

  return (
    <>
      <div className="toolbar">
        <div aria-label="Task lists" className="chips" role="group">
          {Object.keys(LABELS).map((key) => <button aria-pressed={filter === key} className="chip" key={key} onClick={() => setUi({ taskFilter: key })} type="button">{LABELS[key]} <span className={`count${key === 'overdue' && buckets.overdue!.length ? ' count-attention' : ''}`}>{buckets[key]!.length}</span></button>)}
        </div>
        <RowFilter id="task-search" label="Filter these tasks" placeholder="Filter by title" target="#task-list" />
      </div>
      <p className="small muted" style={{ marginTop: 'calc(var(--s-3) * -1)' }}>{HINTS[filter]}</p>
      {list.length
        ? <div><div className="rows" id="task-list">{list.map((t) => <TaskRow key={t.id} showDate task={t} />)}</div><p className="small muted filter-empty" hidden>No tasks match that filter.</p></div>
        : <Empty
            action={filter === 'overdue' || filter === 'done' ? undefined : () => editors.task(null, { scheduledDate: today })}
            actionLabel="New task"
            body={filter === 'overdue' ? 'Everything with a due date is on time.' : 'New tasks you add will appear here.'}
            icon="check"
            pad={filter !== 'overdue'}
            title={filter === 'overdue' ? 'Nothing overdue' : filter === 'done' ? 'No completed tasks yet' : filter === 'inbox' ? 'No undated tasks' : `Nothing in ${LABELS[filter]!.toLowerCase()}`}
          />}
    </>
  )
}

function HabitsTab() {
  const { data } = useHop()
  const editors = useEditors()
  const active = data.habits.filter((h) => h.active)
  const paused = data.habits.filter((h) => !h.active)
  return (
    <>
      <p className="small muted">Consistency is measured over the last four weeks of scheduled days. Missed days don’t reset anything.</p>
      {active.length
        ? <div className="rows">{active.map((h) => <HabitRow habit={h} key={h.id} manage />)}</div>
        : <Empty action={() => editors.habit()} actionLabel="New habit" body="A habit is something you repeat on set days, like “Study ML for 60 minutes”." title="No habits yet" />}
      {paused.length > 0 && <section className="section"><div className="section-head"><h2>Paused</h2></div><div className="rows">{paused.map((h) => <HabitRow habit={h} key={h.id} manage />)}</div></section>}
    </>
  )
}
