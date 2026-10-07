import { useState } from 'react'
import type { FormEvent } from 'react'
import { timestampToLocalDate } from '../lib/date.js'
import { buildGoalFocusGuidance, buildMomentumIndicator, isTaskDueBy, isTaskOverdue, sortTasksForToday } from '../lib/plan.js'
import type { Goal, Habit, HabitCompletion, Task } from '../types/index.js'
import { TaskRow } from '../components/TaskRow.js'

type TodayViewProps = {
  tasks: Task[]
  goals: Goal[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  recentHabitCompletionCount: number
  today: string
  addTask: (body: unknown) => Promise<unknown>
  completeTask: (id: string) => Promise<unknown>
  updateTask: (id: string, changes: Partial<Task>) => Promise<unknown>
  deleteTask: (id: string) => Promise<unknown>
  addHabit: (body: unknown) => Promise<unknown>
  completeHabit: (id: string) => Promise<void>
  error: string
}

export function TodayView({ tasks, goals, habits, habitCompletions, recentHabitCompletionCount, today, addTask, completeTask, updateTask, deleteTask, addHabit, completeHabit, error }: TodayViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [newHabitName, setNewHabitName] = useState('')
  const openTasks = tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const todayTasks = sortTasksForToday(openTasks.filter((task) => isTaskDueBy(task, today)))
  const overdueTasks = openTasks.filter((task) => isTaskOverdue(task, today))
  const completedToday = tasks.filter((task) => task.completedAt && timestampToLocalDate(task.completedAt) === today).length
  const momentum = buildMomentumIndicator(tasks, recentHabitCompletionCount, activeGoals.length)
  const guidance = buildGoalFocusGuidance(activeGoals.length)
  const goalById = new Map(goals.map((goal) => [goal.id, goal]))

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTaskTitle.trim()
    if (!title) return
    if (await addTask({ title, scheduledDate: today, goalId: selectedGoalId || undefined })) setNewTaskTitle('')
  }

  async function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newHabitName.trim()
    if (!name) return
    if (await addHabit({ name })) setNewHabitName('')
  }

  return (
    <>
      <section className="date-strip"><div><p className="date-label">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p><p className="muted">A focused day is built one useful action at a time.</p></div><div className="progress-note"><strong>{completedToday}</strong> meaningful actions today</div></section>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <section className="today-grid">
        <div className="primary-column">
          <div className="section-heading"><div><p className="eyebrow">Your focus</p><h2>Today's priorities</h2></div><span className="count-badge">{todayTasks.length || openTasks.length}</span></div>
          <div className="task-list">
            {(todayTasks.length ? todayTasks : openTasks.slice(0, 3)).map((task) => <TaskRow key={task.id} activeGoals={activeGoals} linkedGoal={task.goalId ? goalById.get(task.goalId) : undefined} onComplete={(id) => void completeTask(id)} onDelete={deleteTask} onUpdate={updateTask} task={task} />)}
            {!todayTasks.length && !openTasks.length && <div className="empty-state"><span className="empty-spark">+</span><strong>Nothing is competing for your attention.</strong><span>Add one useful action below to begin.</span></div>}
          </div>
          <form className="quick-add" onSubmit={(event) => void submitTask(event)}><span className="plus" aria-hidden="true">+</span><input aria-label="Add a task" onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="Add a task for today..." value={newTaskTitle} /><select aria-label="Select a goal for this task" className="goal-select" onChange={(event) => setSelectedGoalId(event.target.value)} value={selectedGoalId}><option value="">No goal</option>{activeGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select><button disabled={!newTaskTitle.trim()} type="submit">Add task</button></form>
        </div>
        <aside className="attention-panel"><div className="section-heading"><div><p className="eyebrow">Keep in view</p><h2>Needs attention</h2></div></div><div className="attention-item"><span className="attention-icon amber">!</span><div><strong>{overdueTasks.length ? `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'task' : 'tasks'}` : 'No overdue work'}</strong><p>{overdueTasks.length ? 'Reschedule or finish what slipped.' : openTasks.length ? `${openTasks.length} open tasks. Choose the next useful action.` : 'You have room to plan deliberately.'}</p></div></div><div className="attention-item"><span className="attention-icon teal">→</span><div><strong>{activeGoals.length ? `${activeGoals.length} active goals` : 'Set a direction'}</strong><p>{activeGoals.length ? 'Keep the long view alive with small actions.' : 'Define the next meaningful goal.'}</p></div></div>{guidance.overloaded && <div className="attention-item"><span className="attention-icon amber">!</span><div><strong>Too many active goals</strong><p>{guidance.detail}</p></div></div>}<div className="attention-item"><span className="attention-icon green">↗</span><div><strong>{momentum.label}</strong><p>{momentum.detail}</p></div></div><div className="pond-note"><span aria-hidden="true">~</span><p>Progress is a direction, not a score.</p></div></aside>
      </section>
      <section className="habit-panel lower-panel"><div className="section-heading"><div><p className="eyebrow">Consistency</p><h2>Habits today</h2></div><span className="count-badge">{habitCompletions.length}/{habits.length}</span></div><div className="habit-list">{habits.map((habit) => { const completed = habitCompletions.some((completion) => completion.habitId === habit.id); return <article className="habit-row" key={habit.id}><button className="check-button" aria-label={`${completed ? 'Completed' : 'Complete'} habit: ${habit.name}`} disabled={completed} onClick={() => void completeHabit(habit.id)} type="button">{completed ? '✓' : '○'}</button><div className="task-copy"><strong>{habit.name}</strong><span>{habit.frequency} · {habit.targetPerWeek}x per week</span></div></article> })}</div><form className="quick-add" onSubmit={(event) => void submitHabit(event)}><span className="plus" aria-hidden="true">+</span><input aria-label="Add a habit" onChange={(event) => setNewHabitName(event.target.value)} placeholder="Add a habit..." value={newHabitName} /><button disabled={!newHabitName.trim()} type="submit">Add habit</button></form></section>
      <section className="lower-grid"><div className="lower-panel"><p className="eyebrow">A little further out</p><h2>Coming up</h2><p className="muted">Your calendar and opportunities will appear here as you build them.</p></div><div className="lower-panel"><p className="eyebrow">End of day</p><h2>Leave a note</h2><p className="muted">Capture what you accomplished, learned, or want to carry into tomorrow.</p><button className="text-button" type="button">Add reflection <span aria-hidden="true">→</span></button></div></section>
    </>
  )
}