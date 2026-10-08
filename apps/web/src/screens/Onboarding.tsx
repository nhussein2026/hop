// First run: name and timezone, one goal, one task. Then Hop opens on Today.
import { useState } from 'react'
import type { FormEvent } from 'react'
import * as D from '../lib/dates.ts'
import { navigate } from '../lib/router.ts'
import type { Goal, Habit, Settings, Task } from '../lib/types.ts'
import { Pad } from '../components/Icon.tsx'
import { Field } from '../components/ui.tsx'
import { api, upsert, useHop } from '../store/store.ts'
import { focusFirstInvalid, formText, useToast } from '../components/ui-context.ts'
import { timezoneOptions } from '../lib/layout.ts'
import { criteriaLines } from '../lib/rules.ts'

type Draft = { name: string; timezone: string; weekStart: Settings['weekStart']; goal: string; criteria: string; why: string; target: string; task: string; habit: string }

export function Onboarding() {
  const { data, commit } = useHop()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Draft>({ name: data.settings.name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || data.settings.timezone, weekStart: data.settings.weekStart, goal: '', criteria: '', why: '', target: '', task: '', habit: '' })

  function fail(form: HTMLFormElement, field: string, message: string) {
    setErrors({ [field]: message })
    focusFirstInvalid(form)
  }

  async function finish(final: Draft) {
    const done = await commit(`Hop is ready, ${final.name}.`, async () => {
      D.setTimezone(final.timezone)
      const today = D.today()
      const settings = await api.patch<Settings>('/api/settings', { name: final.name, timezone: final.timezone, weekStart: final.weekStart })
      const goal = final.goal ? await api.post<Goal>('/api/goals', { name: final.goal, criteria: criteriaLines(final.criteria), why: final.why || undefined, area: 'Career', priority: 'high', startDate: today, targetDate: final.target || D.addDays(today, 120) }) : undefined
      const task = await api.post<Task>('/api/tasks', { title: final.task, priority: 'high', scheduledDate: today, goalId: goal?.id })
      const habit = final.habit ? await api.post<Habit>('/api/habits', { name: final.habit, days: [1, 2, 3, 4, 5], minutes: 45, goalId: goal?.id }) : undefined
      const onboarded = await api.patch<Settings>('/api/settings', { onboarded: true })
      return { settings: { ...settings, ...onboarded }, goal, task, habit }
    }, ({ settings, goal, task, habit }, current) => {
      let next = upsert({ ...current, settings }, 'tasks', task)
      if (goal) next = upsert(next, 'goals', goal)
      if (habit) next = upsert(next, 'habits', habit)
      return next
    })
    if (done) navigate('#/today')
    else toast('Hop could not save your setup. Check your connection and try again.', { type: 'error' })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fd = new FormData(form)
    setErrors({})
    if (step === 1) {
      const name = formText(form, 'name')
      if (!name) return fail(form, 'name', 'Add a name, or a nickname.')
      setDraft({ ...draft, name, timezone: String(fd.get('timezone')), weekStart: Number(fd.get('weekStart')) as Settings['weekStart'] })
      setStep(2)
    } else if (step === 2) {
      const skip = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.name === 'skip'
      const goal = formText(form, 'goal')
      const criteria = String(fd.get('criteria') || '')
      if (!skip && !goal) return fail(form, 'goal', 'Write a goal, or choose Skip for now.')
      if (!skip && !criteriaLines(criteria).length) return fail(form, 'criteria', 'Add at least one. Progress is measured against them.')
      setDraft(skip ? { ...draft, goal: '', criteria: '', why: '', target: '' } : { ...draft, goal, criteria, why: formText(form, 'why'), target: String(fd.get('target') || '') })
      setStep(3)
    } else {
      const task = formText(form, 'task')
      if (!task) return fail(form, 'task', 'One small task is enough. You can change it later.')
      void finish({ ...draft, task, habit: formText(form, 'habit') })
    }
  }

  return (
    <main className="auth onboarding" id="main">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand"><Pad size={32} /><span className="brand-name">Hop</span></div>
        <div aria-label={`Step ${step} of 3`} className="ob-progress">
          {[1, 2, 3].map((n) => <span className={n <= step ? 'on' : ''} key={n} />)}
          <span className="xs muted">Step {step} of 3</span>
        </div>
        {step === 1 && (
          <>
            <h1 tabIndex={-1}>Welcome to Hop</h1>
            <p className="muted">A private place to turn long-term goals into today’s actions. Three quick questions, then you’re in.</p>
            <form className="form-grid" key="1" noValidate onSubmit={submit}>
              <Field autoComplete="given-name" defaultValue={draft.name} error={errors.name} id="ob-name" label="What should Hop call you?" name="name" />
              <div className="form-row">
                <Field defaultValue={draft.timezone} hint="Detected from this device." id="ob-tz" label="Timezone" name="timezone" options={timezoneOptions(draft.timezone)} type="select" />
                <Field defaultValue={String(draft.weekStart)} id="ob-week" label="Your week starts on" name="weekStart" options={[['1', 'Monday'], ['0', 'Sunday'], ['6', 'Saturday']]} type="select" />
              </div>
              <div className="ob-actions"><button className="btn btn-primary btn-lg" type="submit">Continue</button></div>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            <h1 tabIndex={-1}>Where are you heading?</h1>
            <p className="muted">One goal is enough to start. Say how you’ll know it’s reached: progress is measured against that.</p>
            <form className="form-grid" key="2" noValidate onSubmit={submit}>
              <Field defaultValue={draft.goal} error={errors.goal} id="ob-goal" label="A goal for the next few months" name="goal" placeholder="e.g. Land a backend engineering role" />
              <Field defaultValue={draft.criteria} error={errors.criteria} hint="One per line. Each is either true or not yet true." id="ob-criteria" label="How will you know you’ve reached it?" name="criteria" placeholder={'e.g. 3 backend interviews\nOne offer accepted'} rows={3} type="textarea" />
              <Field defaultValue={draft.why} id="ob-why" label="Why it matters" name="why" optional placeholder="The reason you’ll remember on a slow week" />
              <Field defaultValue={draft.target} id="ob-target" label="Target date" name="target" optional type="date" />
              <div className="ob-actions">
                <button className="btn btn-ghost" onClick={() => setStep(1)} type="button">Back</button>
                <span className="spacer" />
                <button className="btn" name="skip" type="submit" value="1">Skip for now</button>
                <button className="btn btn-primary btn-lg" type="submit">Continue</button>
              </div>
            </form>
          </>
        )}
        {step === 3 && (
          <>
            <h1 tabIndex={-1}>What’s one thing for today?</h1>
            <p className="muted">Hop opens on Today. Give it something useful to show you.</p>
            <form className="form-grid" key="3" noValidate onSubmit={submit}>
              <Field defaultValue={draft.task} error={errors.task} id="ob-task" label="One task for today" name="task" placeholder="e.g. Update my resume summary" />
              <Field defaultValue={draft.habit} id="ob-habit" label="A habit to repeat on weekdays" name="habit" optional placeholder="e.g. Study for 45 minutes" />
              <div className="ob-actions">
                <button className="btn btn-ghost" onClick={() => setStep(2)} type="button">Back</button>
                <span className="spacer" />
                <button className="btn btn-primary btn-lg" type="submit">Open Today</button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
