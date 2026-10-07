import { useState } from 'react'
import type { Goal, Task, TaskPriority } from '../types/index.js'

type TaskRowTask = Pick<Task, 'id' | 'title' | 'priority' | 'scheduledDate' | 'dueDate' | 'goalId'> & {
  estimatedMinutes?: number | null
}

type TaskRowProps = {
  task: TaskRowTask
  linkedGoal?: Goal
  activeGoals: Goal[]
  onComplete: (id: string) => void
  onUpdate: (id: string, changes: Partial<Task>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

export function TaskRow({ task, linkedGoal, activeGoals, onComplete, onUpdate, onDelete }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [goalId, setGoalId] = useState(task.goalId ?? '')

  async function save() {
    const nextTitle = title.trim()
    if (!nextTitle) return
    await onUpdate(task.id, { title: nextTitle, scheduledDate: scheduledDate || null, priority, goalId: goalId || null })
    setEditing(false)
  }

  function startEditing() {
    setTitle(task.title)
    setScheduledDate(task.scheduledDate ?? '')
    setPriority(task.priority)
    setGoalId(task.goalId ?? '')
    setEditing(true)
  }

  function confirmDelete() {
    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) void onDelete(task.id)
  }

  // Keep the current goal selectable even when it is no longer active, so saving does not silently unlink it.
  const goalOptions = linkedGoal && !activeGoals.some((goal) => goal.id === linkedGoal.id) ? [linkedGoal, ...activeGoals] : activeGoals

  return (
    <article className={`task-row priority-${task.priority}`}>
      <button className="check-button" aria-label={`Complete ${task.title}`} onClick={() => onComplete(task.id)} type="button">✓</button>
      {editing ? (
        <div className="task-copy edit-task-copy">
          <input aria-label={`Edit ${task.title}`} onChange={(event) => setTitle(event.target.value)} value={title} />
          <div className="task-edit-meta">
            <input aria-label={`Reschedule ${task.title}`} onChange={(event) => setScheduledDate(event.target.value)} type="date" value={scheduledDate} />
            <select aria-label={`Priority for ${task.title}`} onChange={(event) => setPriority(event.target.value as TaskPriority)} value={priority}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <select aria-label={`Goal for ${task.title}`} onChange={(event) => setGoalId(event.target.value)} value={goalId}>
              <option value="">No goal</option>
              {goalOptions.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
            </select>
          </div>
          <div className="task-edit-actions">
            <button className="text-button small" onClick={() => void save()} type="button">Save</button>
            <button className="text-button small" onClick={() => setEditing(false)} type="button">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-copy">
            <strong>{task.title}</strong>
            <span>{task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'Open task'} · {task.priority} priority{linkedGoal ? ` · ${linkedGoal.name}` : ''}</span>
          </div>
          <div className="task-actions">
            <button className="text-button small" aria-label={`Edit ${task.title}`} onClick={startEditing} type="button">Edit</button>
            <button className="text-button small" aria-label={`Delete ${task.title}`} onClick={confirmDelete} type="button">Delete</button>
          </div>
        </>
      )}
    </article>
  )
}