import { useState } from 'react'
import type { FormEvent } from 'react'
import { buildPlanGroups, isClosedOpportunity, sortTasksForToday } from '../lib/plan.js'
import { toLocalDate } from '../lib/date.js'
import type { AgendaItem, Event, Goal, Opportunity, Task, WeeklyReview } from '../types/index.js'
import { TaskRow } from '../components/TaskRow.js'

type PlanViewProps = { tasks: Task[]; goals: Goal[]; events: Event[]; opportunities: Opportunity[]; weeklyReviews: WeeklyReview[]; completeTask: (id: string) => Promise<unknown>; updateTask: (id: string, changes: Partial<Task>) => Promise<unknown>; deleteTask: (id: string) => Promise<unknown>; addEvent: (body: unknown) => Promise<unknown>; error: string }

export function PlanView({ tasks, goals, events, opportunities, weeklyReviews, completeTask, updateTask, deleteTask, addEvent, error }: PlanViewProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toLocalDate)
  const [startTime, setStartTime] = useState('')
  const [type, setType] = useState<Event['type']>('other')
  const today = toLocalDate()
  const agendaItems: AgendaItem[] = events.map((event) => ({ id: event.id, title: event.title, date: event.date, time: event.startTime, type: event.type, source: 'event' as const }))
  for (const opportunity of opportunities.filter((item) => !isClosedOpportunity(item))) {
    if (opportunity.deadline) agendaItems.push({ id: `${opportunity.id}-deadline`, title: `${opportunity.title} deadline`, date: opportunity.deadline, time: null, type: 'deadline', source: 'opportunity' })
    if (opportunity.nextEventDate) agendaItems.push({ id: `${opportunity.id}-next-event`, title: opportunity.nextEventLabel || `${opportunity.title} next step`, date: opportunity.nextEventDate, time: null, type: 'opportunity', source: 'opportunity' })
  }
  agendaItems.push(...weeklyReviews.map((review) => ({ id: `${review.id}-review`, title: 'Weekly review', date: review.weekStart, time: null, type: 'review', source: 'review' as const })))
  const upcomingAgenda = agendaItems.filter((item) => item.date >= today)
  upcomingAgenda.sort((left, right) => `${left.date}${left.time ?? ''}`.localeCompare(`${right.date}${right.time ?? ''}`))
  const groups = buildPlanGroups(sortTasksForToday(tasks))
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const goalById = new Map(goals.map((goal) => [goal.id, goal]))

  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!title.trim() || !date) return; if (!await addEvent({ title: title.trim(), date, startTime: startTime || undefined, type })) return; setTitle(''); setStartTime('') }

  return <section className="plan-page">{error && <p className="error-banner" role="alert">{error}</p>}<div className="section-heading goals-header"><div><p className="eyebrow">Execution</p><h2>Plan</h2></div><span className="count-badge">{upcomingAgenda.length + groups.reduce((total, group) => total + group.items.length, 0)}</span></div><div className="agenda-panel lower-panel"><div className="section-heading"><div><p className="eyebrow">Calendar</p><h2>Agenda</h2></div><span className="count-badge">{events.length}</span></div><form className="quick-add" onSubmit={(event) => void submit(event)}><span className="plus" aria-hidden="true">+</span><input aria-label="Event title" onChange={(event) => setTitle(event.target.value)} placeholder="Add an event..." value={title} /><input aria-label="Event date" onChange={(event) => setDate(event.target.value)} type="date" value={date} /><input aria-label="Event start time" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} /><select aria-label="Event type" onChange={(event) => setType(event.target.value as Event['type'])} value={type}><option value="other">Other</option><option value="meeting">Meeting</option><option value="interview">Interview</option><option value="deadline">Deadline</option><option value="review">Review</option><option value="personal">Personal</option></select><button disabled={!title.trim()} type="submit">Add event</button></form><div className="agenda-list">{upcomingAgenda.length ? upcomingAgenda.map((item) => <article className="agenda-row" key={item.id}><span className="agenda-date">{item.date}</span><div className="task-copy"><strong>{item.title}</strong><span>{item.type}{item.time ? ` · ${item.time}` : ' · All day'} · {item.source}</span></div></article>) : <div className="empty-state"><span className="empty-spark">+</span><strong>No agenda items yet.</strong><span>Add interviews, deadlines, reviews, or personal commitments.</span></div>}</div></div><div className="plan-grid">{groups.length ? groups.map((group) => <div className="plan-group" key={group.date}><div className="plan-group-header"><h3>{group.date === 'unscheduled' ? 'Unscheduled' : new Date(`${group.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</h3><span>{group.items.length}</span></div><div className="plan-list">{group.items.map((task) => <TaskRow key={task.id} activeGoals={activeGoals} linkedGoal={task.goalId ? goalById.get(task.goalId) : undefined} onComplete={(id) => void completeTask(id)} onDelete={deleteTask} onUpdate={updateTask} task={task} />)}</div></div>) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>Your plan is clear.</strong><span>Schedule or add a task to start shaping the next few days.</span></div>}</div></section>
}