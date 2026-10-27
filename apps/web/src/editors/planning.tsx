// Editors for the things you plan: tasks, habits, goals and events.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { readInvite } from '../lib/invite.ts'
import type { InviteEvent } from '../lib/invite.ts'
import { criteriaLines, habitAmount, habitUnits, isClosed, orgOf, targetOn } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Event, Goal, GoalArea, Habit, HabitUnit, Task, TaskPriority, TimeSlot } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import type { TaskFields } from '../store/actions.ts'
import { Icon } from '../components/Icon.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { TimeSlotRows } from '../components/TimeSlots.tsx'
import { cleanSlots, slotMinutes, slotsLabel, timeSlotsError } from '../lib/schedule.ts'
import { Dialog, Field, FieldError, FilePicker, Segmented, SubmitButton } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>

/* ---- Task ------------------------------------------------------------------------------ */
export function TaskEditor({ task, defaults, close }: { task?: Task | null; defaults?: Partial<Task>; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})
  const base = { ...defaults, ...task }
  // Work at set times every week is one task with times, ticked once per occurrence.
  const [repeat, setRepeat] = useState<TimeSlot[] | null>(base.repeat ?? null)
  const goals: [string, string][] = [['', 'No goal'], ...data.goals.filter((g) => g.status === 'active' || g.id === base.goalId).map((g): [string, string] => [g.id, g.name])]
  const opportunities: [string, string][] = [['', 'None'], ...data.opportunities.filter((o) => !isClosed(o) || o.id === base.opportunityId).map((o): [string, string] => [o.id, `${orgOf(o)}: ${o.title}`])]
  const projects: [string, string][] = [['', 'None'], ...data.projects.map((p): [string, string] => [p.id, p.name])]
  const courses: [string, string][] = [['', 'None'], ...data.courses.filter((c) => c.status === 'taking' || c.id === base.courseId).map((c): [string, string] => [c.id, `${c.code} ${c.name}`])]

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const scheduledDate = repeat ? null : String(fd.get('scheduledDate') || '') || null
    const dueDate = repeat ? null : String(fd.get('dueDate') || '') || null
    const estimate = !repeat && fd.get('estimate') ? Number(fd.get('estimate')) : null
    const next: Errors = {}
    if (!title) next.title = 'Give the task a short title.'
    else if (title.length > 200) next.title = 'Keep the title under 200 characters.'
    if (repeat && !repeat.length) next.repeat = 'Add at least one time, or turn repeating off.'
    else if (repeat && timeSlotsError(repeat)) next.repeat = timeSlotsError(repeat)
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
      repeat: repeat ? cleanSlots(repeat) : null,
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
        <label className="switch">
          <span><strong>Repeats every week</strong><span className="xs muted" style={{ display: 'block' }}>Work at set times, like a job’s hours. Ticked once each day it happens.</span></span>
          <input checked={Boolean(repeat)} onChange={(event) => setRepeat(event.target.checked ? [{ day: 1, start: '09:00', end: '10:00' }] : null)} role="switch" type="checkbox" />
        </label>
        {repeat
          ? <fieldset className="field">
              <legend className="field-label">Times</legend>
              <TimeSlotRows idPrefix="task-slot" onChange={setRepeat} slots={repeat} />
              <FieldError error={errors.repeat} />
            </fieldset>
          : <div className="form-row">
              <Field defaultValue={base.scheduledDate} label="Do on" name="scheduledDate" optional type="date" />
              <Field defaultValue={base.dueDate} error={errors.dueDate} label="Due" name="dueDate" optional type="date" />
            </div>}
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
            {!repeat && <Field defaultValue={base.estimatedMinutes ?? ''} error={errors.estimate} label="Estimate in minutes" max={600} min={5} name="estimate" optional type="number" />}
            <Field defaultValue={base.description} label="Notes" name="notes" optional type="textarea" />
          </div>
        </details>
      </div>
    </Dialog>
  )
}

/* ---- Habit -------------------------------------------------------------------------------- */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const UNIT_OPTIONS: [HabitUnit, string][] = [['minutes', 'Minutes'], ['pages', 'Pages'], ['times', 'Times']]
const TARGET_LABEL: Record<HabitUnit, string> = { minutes: 'Minutes each time', pages: 'Pages each time', times: 'Times each day' }
const wholeNumber = (value: string) => (value && /^\d+$/.test(value) ? Number(value) : null)

export function HabitEditor({ habit, close }: { habit?: Habit | null; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})
  const [unit, setUnit] = useState<HabitUnit>(habit?.unit ?? 'minutes')
  const [slots, setSlots] = useState<TimeSlot[]>(habit?.slots ?? [])
  const timed = slots.length > 0
  // Counted in minutes and timed, each day's target is the length of its times.
  const targetFromTimes = timed && unit === 'minutes'
  const days = habit?.days ?? [1, 2, 3, 4, 5]
  const goals: [string, string][] = [['', 'No goal'], ...data.goals.filter((g) => g.status === 'active' || g.id === habit?.goalId).map((g): [string, string] => [g.id, g.name])]

  /** One row per day ticked above, all at the same time. */
  function sameTimeOnDays(form: HTMLFormElement | null) {
    const ticked = form ? [...form.querySelectorAll<HTMLInputElement>('input[name="days"]:checked')].map((input) => Number(input.value)) : []
    setSlots((ticked.length ? ticked : [1]).map((day) => ({ day, start: '09:00', end: '10:00' })))
  }

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const name = formText(form, 'name')
    const picked = timed ? [...new Set(slots.map((slot) => slot.day))] : fd.getAll('days').map(Number)
    const target = targetFromTimes ? slotMinutes(slots[0]!) : wholeNumber(formText(form, 'target'))
    const minimum = wholeNumber(formText(form, 'minimum'))
    const minutes = unit === 'minutes' ? undefined : wholeNumber(formText(form, 'minutes'))
    const next: Errors = {}
    if (!name) next.name = 'Name the habit.'
    if (!picked.length) next.days = 'Pick at least one day.'
    const slotError = timeSlotsError(slots)
    if (slotError) next.slots = slotError
    if (!target || target > 1000) next.target = unit === 'minutes' ? 'Use whole minutes, 1 to 1000.' : 'Use a whole number, 1 to 1000.'
    if (formText(form, 'minimum') && !minimum) next.minimum = 'Use a whole number, or leave it empty.'
    else if (minimum && target && minimum > target && !targetFromTimes) next.minimum = 'The minimum can’t be more than the target.'
    if (unit !== 'minutes' && (!minutes || minutes < 5 || minutes > 240)) next.minutes = 'Use 5 to 240 minutes.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { name, days: picked, unit, target: target!, minimum, slots: cleanSlots(slots), goalId: String(fd.get('goalId') || '') || null }
    const saved = await actions.habits.save(habit ?? null, minutes ? { ...fields, minutes } : fields)
    if (saved) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{habit ? 'Save changes' : 'Add habit'}</SubmitButton></>} onClose={close} onSubmit={submit} title={habit ? 'Edit habit' : 'New habit'}>
      <div className="form-grid">
        <Field defaultValue={habit?.name} error={errors.name} label="Habit" name="name" placeholder="e.g. Solve 2 algorithm problems" required />
        {!timed && (
          <fieldset className="field day-picker">
            <legend className="field-label">Days</legend>
            <div className="day-boxes">
              {WEEK_ORDER.map((day) => <label className="day-box" key={day}><input defaultChecked={days.includes(day)} name="days" type="checkbox" value={day} /><span>{D.DAYS[day]}</span></label>)}
            </div>
            <FieldError error={errors.days} />
          </fieldset>
        )}
        <fieldset className="field">
          <legend className="field-label">Times <span className="optional">(optional)</span></legend>
          {timed
            ? <>
                <p className="field-hint" style={{ marginTop: 0 }}>The days come from the times. Add “Dates” to a time that only runs for a while.</p>
                <TimeSlotRows idPrefix="habit-slot" onChange={setSlots} slots={slots} />
                {slots.length > 1 && slots.some((slot) => slot.start !== slots[0]!.start || slot.end !== slots[0]!.end) && (
                  <button className="link-btn small" onClick={() => setSlots(slots.map((slot) => ({ ...slot, start: slots[0]!.start, end: slots[0]!.end })))} style={{ justifySelf: 'start' }} type="button">Copy the first time to all rows</button>
                )}
              </>
            : <div className="btn-row">
                <button className="btn btn-sm" onClick={() => setSlots([{ day: days[0] ?? 1, start: '09:00', end: '10:00' }])} type="button"><Icon className="icon-sm" name="clock" />Add a time</button>
                <button className="btn btn-sm btn-ghost" onClick={(event) => sameTimeOnDays(event.currentTarget.form)} type="button">Same time on these days</button>
              </div>}
          <FieldError error={errors.slots} />
        </fieldset>
        <div className="form-row">
          <Field defaultValue={unit} label="Counted in" name="unit" onChange={(value) => setUnit(value as HabitUnit)} options={UNIT_OPTIONS} type="select" />
          {targetFromTimes
            ? <div className="field"><span className="field-label">Minutes each time</span><p className="small muted" style={{ margin: 0 }}>Each day’s target is its times: {slotsLabel(slots)}.</p></div>
            : <Field defaultValue={habit?.target ?? 30} error={errors.target} label={TARGET_LABEL[unit]} max={1000} min={1} name="target" type="number" />}
        </div>
        <div className="form-row">
          <Field defaultValue={habit?.minimum ?? ''} error={errors.minimum} hint="For a bad day. Never zero twice." label="Minimum" max={1000} min={1} name="minimum" optional type="number" />
          {unit !== 'minutes' && <Field defaultValue={habit?.minutes ?? 20} error={errors.minutes} hint="For your learning time." label="About how many minutes?" max={240} min={5} name="minutes" type="number" />}
        </div>
        <Field defaultValue={habit?.goalId ?? ''} label="Supports goal" name="goalId" options={goals} type="select" />
      </div>
    </Dialog>
  )
}

/** Log part of a habit, or more than its target, for today. */
export function LogHabit({ habit, close }: { habit: Habit; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const today = D.today()
  const current = habitAmount(habit, data.completions, today)
  const target = targetOn(habit, today)

  async function save(form: HTMLFormElement | null, amount: number | null) {
    if (!amount || amount > 1000) return setError('Use a whole number, 1 to 1000.')
    if (await actions.habits.log(habit, amount, today) && form) closeDialog(form)
  }

  return (
    <Dialog
      className="dialog-sm"
      desc={`Target ${habitUnits(habit, target)}${habit.minimum !== null && habit.minimum < target ? `, minimum ${habitUnits(habit, habit.minimum)}` : ''}. Less still counts; never zero twice.`}
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save</SubmitButton></>}
      onClose={close}
      onSubmit={(form) => save(form, wholeNumber(formText(form, 'amount')))}
      title={`How much today: ${habit.name}?`}
    >
      <div className="form-grid">
        <div className="btn-row">
          {habit.minimum !== null && habit.minimum < target && <button className="btn btn-sm" onClick={(event) => void save(event.currentTarget.form, habit.minimum)} type="button">Minimum: {habitUnits(habit, habit.minimum)}</button>}
          <button className="btn btn-sm" onClick={(event) => void save(event.currentTarget.form, target)} type="button">Target: {habitUnits(habit, target)}</button>
        </div>
        <Field defaultValue={current || ''} error={error} label={`${UNIT_OPTIONS.find(([value]) => value === habit.unit)![1]} today`} max={1000} min={1} name="amount" type="number" />
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
/**
 * A new event, or an existing one opened from the calendar. A repeating event has its times per
 * weekday instead of one time; `occurrence` is the date it was opened on, so that date can be skipped.
 */
export function EventEditor({ date: initialDate, event, occurrence, close }: { date?: string; event?: Event | null; occurrence?: string; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [repeat, setRepeat] = useState<TimeSlot[] | null>(event?.repeat ?? null)
  // Filling from an invitation replaces the draft, and `filled` remounts the fields so they show it.
  const [draft, setDraft] = useState<InviteEvent>(event
    ? { title: event.title, date: event.date, startTime: event.startTime, endTime: event.endTime, description: event.description }
    : { title: '', date: initialDate ?? D.today(), startTime: '14:00', endTime: null, description: null })
  const [filled, setFilled] = useState(0)
  const [inviteFile, setInviteFile] = useState<File | null>(null)
  const [invite, setInvite] = useState<{ error?: string; done?: string }>({})
  const opportunities: [string, string][] = [['', 'None'], ...data.opportunities.filter((o) => !isClosed(o)).map((o): [string, string] => [o.id, `${orgOf(o)}: ${o.title}`])]

  function fill(text: string) {
    const result = readInvite(text, data.settings.timezone)
    if (!result.ok) { setInvite({ error: result.error }); return }
    setDraft(result.event)
    setFilled((count) => count + 1)
    setErrors({})
    setInvite({ done: `Filled in for ${D.withDay(result.event.date)}. Check the details, then add the event.` })
  }

  async function chooseFile(file: File | null, problem?: string) {
    setInviteFile(file)
    if (problem) setInvite({ error: problem })
    else if (file) fill(await file.text())
  }

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const date = String(fd.get('date') || '')
    const startTime = repeat ? '' : String(fd.get('start') || '')
    const endTime = repeat ? '' : String(fd.get('end') || '')
    const next: Errors = {}
    if (!title) next.title = 'Name the event.'
    if (!date) next.date = repeat ? 'Pick the first day it can happen.' : 'Pick a date.'
    if (endTime && !startTime) next.end = 'Add a start time too, or leave the end empty.'
    else if (startTime && endTime && endTime < startTime) next.end = 'The end can’t be before the start.'
    if (repeat && !repeat.length) next.repeat = 'Add at least one time, or turn repeating off.'
    else if (repeat && timeSlotsError(repeat)) next.repeat = timeSlotsError(repeat)
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = {
      title,
      date,
      startTime,
      endTime: endTime || null,
      description: formText(form, 'notes') || null,
      type: fd.get('type') as Event['type'],
      opportunityId: String(fd.get('opportunityId') || '') || null,
      repeat: repeat ? cleanSlots(repeat) : null,
    }
    const saved = event
      ? await actions.plan.updateEvent(event, { ...fields, startTime: startTime || null })
      : await actions.plan.addEvent(fields)
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!event || !await confirm({ title: event.repeat ? 'Delete every date of this event?' : 'Delete this event?', body: event.repeat ? `“${event.title}” and all its weekly dates leave the calendar. To drop one date, use Skip this one.` : `“${event.title}” leaves the calendar.`, confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.plan.removeEvent(event)) closeDialog(form)
  }

  async function skip(form: HTMLFormElement) {
    if (event && occurrence && await actions.plan.skipEvent(event, occurrence)) closeDialog(form)
  }

  return (
    <Dialog
      desc={event ? undefined : 'Something that happens at a set time: an interview, a call, a meetup.'}
      foot={<>
        {event && <button className="btn btn-ghost btn-danger" onClick={(e) => void remove(e.currentTarget.form!)} type="button"><Icon className="icon-sm" name="trash" />Delete</button>}
        {event?.repeat && occurrence && <button className="btn btn-ghost" onClick={(e) => void skip(e.currentTarget.form!)} type="button">Skip {D.withDay(occurrence)}</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{event ? 'Save' : 'Add event'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={event ? 'Edit event' : 'New event'}
    >
      <div className="form-grid">
        {!event && <details className="disclosure" open={Boolean(invite.error || invite.done) || undefined}>
          <summary>Fill from an invitation</summary>
          <div className="form-grid" style={{ marginTop: 'var(--s-3)' }}>
            <FilePicker accept={['.ics']} hint="The invite.ics file attached to a calendar invitation email." label="Invitation file" maxBytes={1_000_000} onChange={(file, problem) => void chooseFile(file, problem)} optional value={inviteFile} />
            <div className="field">
              <label htmlFor="ev-invite-link">Or paste an “Add to calendar” link (Google, Outlook or Yahoo)</label>
              <div className="btn-row">
                <input
                  aria-describedby={invite.error ? 'ev-invite-err' : undefined}
                  className="input"
                  id="ev-invite-link"
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); fill(event.currentTarget.value) } }}
                  placeholder="https://calendar.google.com/…"
                  style={{ flex: '1 1 220px' }}
                />
                <button className="btn" onClick={(event) => fill((event.currentTarget.previousElementSibling as HTMLInputElement).value)} type="button">Fill in</button>
              </div>
              <FieldError error={invite.error} id="ev-invite-err" />
            </div>
            {invite.done && <p className="xs muted" role="status">{invite.done}</p>}
          </div>
        </details>}
        <div className="form-grid" key={filled}>
          <Field defaultValue={draft.title} error={errors.title} id="ev-title" label="Event" name="title" placeholder="e.g. Getir recruiter call" required />
          <label className="switch">
            <span><strong>Repeats every week</strong><span className="xs muted" style={{ display: 'block' }}>A weekly meeting, with its own time on each day.</span></span>
            <input checked={Boolean(repeat)} onChange={(e) => setRepeat(e.target.checked ? [{ day: D.weekday(draft.date), start: draft.startTime || '19:00', end: draft.endTime || '20:00' }] : null)} role="switch" type="checkbox" />
          </label>
          {repeat
            ? <>
                <Field defaultValue={draft.date} error={errors.date} hint="The first day it can happen." id="ev-date" label="Starting" name="date" type="date" />
                <fieldset className="field">
                  <legend className="field-label">Times</legend>
                  <TimeSlotRows idPrefix="event-slot" onChange={setRepeat} slots={repeat} />
                  <FieldError error={errors.repeat} />
                </fieldset>
              </>
            : <div className="form-row">
                <Field defaultValue={draft.date} error={errors.date} id="ev-date" label="Date" name="date" type="date" />
                <Field defaultValue={draft.startTime ?? ''} id="ev-start" label="Start" name="start" optional type="time" />
                <Field defaultValue={draft.endTime ?? ''} error={errors.end} id="ev-end" label="End" name="end" optional type="time" />
              </div>}
          <div className="form-row">
            {/* Most invitations aren't interviews, so a filled-in event starts as a plain event. */}
            <Field defaultValue={event ? event.type : filled ? 'other' : undefined} id="ev-type" label="Type" name="type" options={[['interview', 'Interview'], ['meeting', 'Meeting'], ['other', 'Event'], ['review', 'Review']]} type="select" />
            <Field defaultValue={event?.opportunityId ?? ''} id="ev-opp" label="Opportunity" name="opportunityId" options={opportunities} type="select" />
          </div>
          <Field defaultValue={draft.description ?? ''} id="ev-notes" label="Notes" name="notes" optional type="textarea" />
          <p className="xs muted">A class that repeats every week? <a data-close href="#/itu/courses">Add it as a course</a>, and its classes show on the calendar.</p>
        </div>
      </div>
    </Dialog>
  )
}
