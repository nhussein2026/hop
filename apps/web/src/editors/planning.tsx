// Editors for the things you plan: tasks, habits, goals and events.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { criteriaLines, isClosed, orgOf } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Event, Goal, GoalArea, Habit, Task, TaskPriority } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import type { TaskFields } from '../store/actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, FieldError, Segmented, SubmitButton } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>

/* ---- Task ------------------------------------------------------------------------------ */
export function TaskEditor({ task, defaults, close }: { task?: Task | null; defaults?: Partial<Task>; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})
  const base = { ...defaults, ...task }
  const goals: [string, string][] = [['', 'No goal'], ...data.goals.filter((g) => g.status === 'active' || g.id === base.goalId).map((g): [string, string] => [g.id, g.name])]
  const opportunities: [string, string][] = [['', 'None'], ...data.opportunities.filter((o) => !isClosed(o) || o.id === base.opportunityId).map((o): [string, string] => [o.id, `${orgOf(o)}: ${o.title}`])]
  const projects: [string, string][] = [['', 'None'], ...data.projects.map((p): [string, string] => [p.id, p.name])]
  const courses: [string, string][] = [['', 'None'], ...data.courses.filter((c) => c.status === 'taking' || c.id === base.courseId).map((c): [string, string] => [c.id, `${c.code} ${c.name}`])]

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const scheduledDate = String(fd.get('scheduledDate') || '') || null
    const dueDate = String(fd.get('dueDate') || '') || null
    const estimate = fd.get('estimate') ? Number(fd.get('estimate')) : null
    const next: Errors = {}
    if (!title) next.title = 'Give the task a short title.'
    else if (title.length > 200) next.title = 'Keep the title under 200 characters.'
    if (scheduledDate && dueDate && dueDate < scheduledDate) next.dueDate = 'Due date can’t be before the day you plan to do it.'
    if (estimate !== null && (estimate < 5 || estimate > 600)) next.estimate = 'Use 5 to 600 minutes.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const courseId = String(fd.get('courseId') || '') || null
    const fields: TaskFields = {
      title,
      scheduledDate,
      dueDate,
      priority: (fd.get('priority') as TaskPriority) || 'medium',
      goalId: String(fd.get('goalId') || '') || null,
      opportunityId: String(fd.get('opportunityId') || '') || null,
      projectId: String(fd.get('projectId') || '') || null,
      courseId,
      // A prep task stays linked to its graded item only while it stays with that course.
      assessmentId: courseId && courseId === base.courseId ? base.assessmentId ?? null : null,
      estimatedMinutes: estimate,
      description: formText(form, 'notes') || null,
    }
    const saved = task ? await actions.tasks.update(task, fields) : await actions.tasks.add(fields)
    if (!saved) return 'This change wasn’t saved. Check your connection and try again.'
    closeDialog(form)
  }

  return (
    <Dialog
      foot={<>
        {task && <><button className="btn btn-ghost" onClick={(event) => { closeDialog(event.currentTarget.form!); void actions.tasks.remove(task) }} style={{ color: 'var(--danger)' }} type="button"><Icon className="icon-sm" name="trash" />Delete</button><span className="spacer" /></>}
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{task ? 'Save changes' : 'Add task'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={task ? 'Edit task' : 'New task'}
    >
      <div className="form-grid">
        <Field defaultValue={base.title} error={errors.title} label="Task" name="title" placeholder="What exactly needs to happen?" required />
        <div className="form-row">
          <Field defaultValue={base.scheduledDate} label="Do on" name="scheduledDate" optional type="date" />
          <Field defaultValue={base.dueDate} error={errors.dueDate} label="Due" name="dueDate" optional type="date" />
        </div>
        <Segmented defaultValue={base.priority ?? 'medium'} label="Priority" name="priority" options={[['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
        <Field defaultValue={base.goalId ?? ''} label="Moves goal" name="goalId" options={goals} type="select" />
        <details className="disclosure" open={Boolean(base.opportunityId || base.projectId || base.courseId || base.description) || undefined}>
          <summary>More details</summary>
          <div className="form-grid" style={{ marginTop: 'var(--s-3)' }}>
            <div className="form-row">
              <Field defaultValue={base.opportunityId ?? ''} label="Opportunity" name="opportunityId" options={opportunities} type="select" />
              <Field defaultValue={base.projectId ?? ''} label="Project" name="projectId" options={projects} type="select" />
            </div>
            {courses.length > 1 && <Field defaultValue={base.courseId ?? ''} label="Course" name="courseId" options={courses} type="select" />}
            <Field defaultValue={base.estimatedMinutes ?? ''} error={errors.estimate} label="Estimate in minutes" max={600} min={5} name="estimate" optional type="number" />
            <Field defaultValue={base.description} label="Notes" name="notes" optional type="textarea" />
          </div>
        </details>
      </div>
    </Dialog>
  )
}

/* ---- Habit -------------------------------------------------------------------------------- */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function HabitEditor({ habit, close }: { habit?: Habit | null; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})
  const days = habit?.days ?? [1, 2, 3, 4, 5]
  const goals: [string, string][] = [['', 'No goal'], ...data.goals.filter((g) => g.status === 'active' || g.id === habit?.goalId).map((g): [string, string] => [g.id, g.name])]

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const name = formText(form, 'name')
    const picked = fd.getAll('days').map(Number)
    const minutes = Number(fd.get('minutes')) || 30
    const next: Errors = {}
    if (!name) next.name = 'Name the habit.'
    if (!picked.length) next.days = 'Pick at least one day.'
    if (minutes < 5 || minutes > 240) next.minutes = 'Use 5 to 240 minutes.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.habits.save(habit ?? null, { name, days: picked, minutes, goalId: String(fd.get('goalId') || '') || null })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{habit ? 'Save changes' : 'Add habit'}</SubmitButton></>} onClose={close} onSubmit={submit} title={habit ? 'Edit habit' : 'New habit'}>
      <div className="form-grid">
        <Field defaultValue={habit?.name} error={errors.name} label="Habit" name="name" placeholder="e.g. Solve 2 algorithm problems" required />
        <fieldset className="field day-picker">
          <legend className="field-label">Days</legend>
          <div className="day-boxes">
            {WEEK_ORDER.map((day) => <label className="day-box" key={day}><input defaultChecked={days.includes(day)} name="days" type="checkbox" value={day} /><span>{D.DAYS[day]}</span></label>)}
          </div>
          <FieldError error={errors.days} />
        </fieldset>
        <div className="form-row">
          <Field defaultValue={habit?.minutes ?? 30} error={errors.minutes} label="Minutes each time" max={240} min={5} name="minutes" type="number" />
          <Field defaultValue={habit?.goalId ?? ''} label="Supports goal" name="goalId" options={goals} type="select" />
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Goal ---------------------------------------------------------------------------------- */
const AREAS: GoalArea[] = ['Career', 'Learning', 'Projects', 'Health', 'Finances', 'Personal']

export function GoalEditor({ goal, close }: { goal?: Goal | null; close: () => void }) {
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const name = formText(form, 'name')
    const targetDate = String(fd.get('targetDate') || '')
    const next: Errors = {}
    const criteria = criteriaLines(String(fd.get('criteria') || ''))
    if (!name) next.name = 'Name the goal.'
    if (!goal && !criteria.length) next.criteria = 'Add at least one. Progress is measured against them.'
    if (!targetDate) next.targetDate = 'Pick a target date. You can change it later.'
    else if (!goal && targetDate <= D.today()) next.targetDate = 'Choose a date in the future.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const why = formText(form, 'why')
    const area = fd.get('area') as GoalArea
    if (goal) {
      if (await actions.goals.update(goal, { name, why: why || null, targetDate, area })) closeDialog(form)
      return
    }
    const created = await actions.goals.create({ name, why, targetDate, area, criteria })
    if (created) {
      closeDialog(form)
      navigate(`#/goals/${created.id}`)
    }
  }

  return (
    <Dialog
      desc={goal ? undefined : 'A goal is a destination. Tasks and habits are how you get there.'}
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{goal ? 'Save changes' : 'Create goal'}</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title={goal ? 'Edit goal' : 'New goal'}
    >
      <div className="form-grid">
        <Field defaultValue={goal?.name} error={errors.name} label="Goal" name="name" placeholder="e.g. Become a strong AI engineer" required />
        <Field defaultValue={goal?.why} label="Why it matters" name="why" placeholder="The reason you’ll remember on a slow week" rows={2} type="textarea" />
        <div className="form-row">
          <Field defaultValue={goal?.targetDate} error={errors.targetDate} label="Target date" name="targetDate" required type="date" />
          <Field defaultValue={goal?.area ?? 'Career'} label="Area" name="area" options={AREAS} type="select" />
        </div>
        {!goal && <Field error={errors.criteria} hint="One per line. Progress is the share of these that are true. You can add more later." label="How will you know you’ve reached it?" name="criteria" required placeholder={'Strong Python\n3 serious AI projects'} rows={4} type="textarea" />}
      </div>
    </Dialog>
  )
}

/* ---- Event ---------------------------------------------------------------------------------- */
export function EventEditor({ date: initialDate, close }: { date?: string; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})
  const opportunities: [string, string][] = [['', 'None'], ...data.opportunities.filter((o) => !isClosed(o)).map((o): [string, string] => [o.id, `${orgOf(o)}: ${o.title}`])]

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const date = String(fd.get('date') || '')
    const next: Errors = {}
    if (!title) next.title = 'Name the event.'
    if (!date) next.date = 'Pick a date.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.plan.addEvent({ title, date, startTime: String(fd.get('start') || ''), type: fd.get('type') as Event['type'], opportunityId: String(fd.get('opportunityId') || '') || null })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog desc="Something that happens at a set time: an interview, a call, a meetup." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add event</SubmitButton></>} onClose={close} onSubmit={submit} title="New event">
      <div className="form-grid">
        <Field error={errors.title} id="ev-title" label="Event" name="title" placeholder="e.g. Getir recruiter call" required />
        <div className="form-row">
          <Field defaultValue={initialDate ?? D.today()} error={errors.date} id="ev-date" label="Date" name="date" type="date" />
          <Field defaultValue="14:00" id="ev-start" label="Start" name="start" type="time" />
        </div>
        <div className="form-row">
          <Field id="ev-type" label="Type" name="type" options={[['interview', 'Interview'], ['other', 'Event'], ['review', 'Review']]} type="select" />
          <Field id="ev-opp" label="Opportunity" name="opportunityId" options={opportunities} type="select" />
        </div>
      </div>
    </Dialog>
  )
}
