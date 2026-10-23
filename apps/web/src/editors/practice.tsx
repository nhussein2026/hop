// Language track dialogs: setting the track up, editing the daily plan, logging practice outside
// the plan, practice test results, skill checks, and the track itself (level, exam date, exam sections).
import { useState } from 'react'
import { CEFR_LEVELS, CHECK_AREAS, CHECK_JUDGES, ITU_TOMER_EXAM, LANGUAGE_SKILLS, PRACTICE_AREAS, PRACTICE_SLOTS } from '@hop/domain'
import * as D from '../lib/dates.ts'
import { checkValues, formatValue } from '../lib/checks.ts'
import { CHECK_AREA, CHECK_JUDGE, PRACTICE_AREA, PRACTICE_SLOT_LABEL } from '../lib/labels.ts'
import type { CefrLevel, CheckArea, CheckJudge, CheckMetrics, LanguageCheck, LanguageSkill, ListeningMode, PracticeActivity, PracticeArea, PracticeSession, PracticeSlot, PracticeTest } from '../lib/types.ts'
import { usePracticeActions } from '../store/practice-actions.ts'
import { useHop } from '../store/store.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, Segmented, SubmitButton } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const LEVEL_OPTIONS = CEFR_LEVELS.map((level): [string, string] => [level, level])
const AREA_OPTIONS = PRACTICE_AREAS.map((area): [string, string] => [area, PRACTICE_AREA[area][1]])
const SLOT_OPTIONS = PRACTICE_SLOTS.map((slot): [string, string] => [slot, PRACTICE_SLOT_LABEL[slot]])

/** A whole number from a form field, or null when it's empty. */
function formNumber(form: HTMLFormElement, name: string) {
  const value = formText(form, name)
  return value ? Number(value) : null
}

const isWhole = (value: number | null, min: number, max: number): value is number => value !== null && Number.isInteger(value) && value >= min && value <= max

const sectionLine = (sections: Record<LanguageSkill, number>) => LANGUAGE_SKILLS.map((skill) => `${PRACTICE_AREA[skill][1]} ${sections[skill]}`).join(', ')

/* ---- Set up the track ------------------------------------------------------------------- */
export function SetupTrack({ close }: { close: () => void }) {
  const actions = usePracticeActions()
  const [error, setError] = useState('')
  const today = D.today()

  async function submit(form: HTMLFormElement) {
    const level = formText(form, 'level') as CefrLevel
    const target = formText(form, 'target') as CefrLevel
    const examDate = formText(form, 'examDate')
    const message = CEFR_LEVELS.indexOf(target) <= CEFR_LEVELS.indexOf(level) ? 'The target must be above the level you’re at now.' : !examDate || examDate <= today ? 'Pick an exam date in the future.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    if (await actions.track.setup({ level, target, examDate })) closeDialog(form)
  }

  return (
    <Dialog
      desc="Hop builds the route to the exam and a daily plan for all four skills. You can change all of it later."
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Set up my track</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title="Set up your Turkish track"
    >
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue="A2" hint="The level of the course you’re in now." label="Level now" name="level" options={LEVEL_OPTIONS} type="select" />
          <Field defaultValue="C1" label="Target" name="target" options={LEVEL_OPTIONS} type="select" />
        </div>
        <Field defaultValue={D.startOfMonth(D.addMonths(today, 9))} error={error} hint="When you plan to take the certificate exam." label="Exam date" name="examDate" type="date" />
        <div className="setup-points small">
          <p><Icon className="icon-sm" name="goals" /> A goal with a checkpoint for each level, spaced like İTÜ TÖMER’s courses.</p>
          <p><Icon className="icon-sm" name="calendar" /> A daily plan of about three hours, Monday to Saturday, with a lighter Sunday. Listening and reading on the bus and train; speaking and writing at home.</p>
          <p><Icon className="icon-sm" name="award" /> Practice tests scored like {ITU_TOMER_EXAM.name}: {sectionLine(ITU_TOMER_EXAM.sections)}. {ITU_TOMER_EXAM.passMark} of 100 passes.</p>
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Edit the track ---------------------------------------------------------------------- */
export function TrackEditor({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = usePracticeActions()
  const track = data.settings.languageTrack!
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const level = formText(form, 'level') as CefrLevel
    const target = formText(form, 'target') as CefrLevel
    const examDate = formText(form, 'examDate')
    const sections = Object.fromEntries(LANGUAGE_SKILLS.map((skill) => [skill, formNumber(form, skill)])) as Record<LanguageSkill, number | null>
    const passMark = formNumber(form, 'passMark')
    const next: Errors = {}
    if (CEFR_LEVELS.indexOf(target) <= CEFR_LEVELS.indexOf(level)) next.target = 'The target must be above your level.'
    if (!examDate) next.examDate = 'Add the exam date.'
    if (!formText(form, 'examName')) next.examName = 'Name the exam.'
    if (LANGUAGE_SKILLS.some((skill) => !isWhole(sections[skill], 1, 100))) next.sections = 'Give each section its points, like 25.'
    else if (LANGUAGE_SKILLS.reduce((sum, skill) => sum + sections[skill]!, 0) !== 100) next.sections = 'The sections must add up to 100.'
    if (!isWhole(passMark, 1, 100)) next.passMark = 'Use a pass mark from 1 to 100.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const exam = { name: formText(form, 'examName'), sections: sections as Record<LanguageSkill, number>, passMark: passMark! }
    if (await actions.track.update({ level, target, examDate, exam }, 'Track updated')) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save</SubmitButton></>} onClose={close} onSubmit={submit} title="Your track">
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={track.level} label="Level now" name="level" options={LEVEL_OPTIONS} type="select" />
          <Field defaultValue={track.target} error={errors.target} label="Target" name="target" options={LEVEL_OPTIONS} type="select" />
          <Field defaultValue={track.examDate} error={errors.examDate} label="Exam date" name="examDate" type="date" />
        </div>
        <p className="xs muted">Changing the exam date doesn’t move the level checkpoints. Move those in Goals.</p>
        <Field defaultValue={track.exam.name} error={errors.examName} label="Exam" name="examName" />
        <fieldset className="field">
          <legend className="field-label">Points per section (they add up to 100)</legend>
          <div className="form-row">
            {LANGUAGE_SKILLS.map((skill) => <Field defaultValue={track.exam.sections[skill]} id={`te-${skill}`} key={skill} label={PRACTICE_AREA[skill][1]} max={100} min={1} name={skill} type="number" />)}
          </div>
          {errors.sections && <span className="field-error"><Icon className="icon-sm" name="alertCircle" />{errors.sections}</span>}
        </fieldset>
        <Field defaultValue={track.exam.passMark} error={errors.passMark} label="Pass mark (out of 100)" max={100} min={1} name="passMark" type="number" />
      </div>
    </Dialog>
  )
}

/* ---- A plan activity -------------------------------------------------------------------- */
export function ActivityEditor({ activity, close }: { activity?: PracticeActivity | null; close: () => void }) {
  const actions = usePracticeActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const minutes = formNumber(form, 'minutes')
    const days = fd.getAll('days').map(Number)
    const next: Errors = {}
    if (!title) next.title = 'Name the activity.'
    if (!isWhole(minutes, 1, 240)) next.minutes = 'Use whole minutes, from 1 to 240.'
    if (!days.length) next.days = 'Pick at least one day.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { title, area: formText(form, 'area') as PracticeArea, minutes: minutes!, slot: formText(form, 'slot') as PracticeSlot, days, detail: formText(form, 'detail') }
    const saved = activity ? await actions.activities.update(activity, fields, 'Plan updated') : await actions.activities.add(fields)
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!activity || !await confirm({ title: 'Remove from your plan?', body: `“${activity.title}” leaves the daily plan. Practice you already logged for it stays.`, confirmLabel: 'Remove', tone: 'danger' })) return
    if (await actions.activities.remove(activity)) closeDialog(form)
  }

  const days = activity?.days ?? [1, 2, 3, 4, 5, 6]
  return (
    <Dialog
      foot={<>
        {activity && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">Remove</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{activity ? 'Save' : 'Add to plan'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={activity ? 'Edit activity' : 'Add to your plan'}
    >
      <div className="form-grid">
        <Field defaultValue={activity?.title} error={errors.title} label="Activity" name="title" placeholder="e.g. Shadowing" required />
        <div className="form-row">
          <Field defaultValue={activity?.area ?? 'listening'} label="Skill" name="area" options={AREA_OPTIONS} type="select" />
          <Field defaultValue={activity?.minutes ?? 20} error={errors.minutes} label="Minutes" max={240} min={1} name="minutes" type="number" />
          <Field defaultValue={activity?.slot ?? 'any'} label="When" name="slot" options={SLOT_OPTIONS} type="select" />
        </div>
        <fieldset className="field day-picker">
          <legend className="field-label">Days</legend>
          <div className="day-boxes">{WEEK_ORDER.map((day) => <label className="day-box" key={day}><input defaultChecked={days.includes(day)} name="days" type="checkbox" value={day} /><span>{D.DAYS[day]}</span></label>)}</div>
          {errors.days && <span className="field-error"><Icon className="icon-sm" name="alertCircle" />{errors.days}</span>}
        </fieldset>
        <Field defaultValue={activity?.detail} hint="Shown under the activity, so you remember how to do it well." label="How to do it" name="detail" optional rows={4} type="textarea" />
      </div>
    </Dialog>
  )
}

/* ---- Practice outside the plan ---------------------------------------------------------- */
export function LogPractice({ area, close }: { area?: PracticeArea; close: () => void }) {
  const actions = usePracticeActions()
  const [error, setError] = useState('')
  const [chosen, setChosen] = useState<PracticeArea>(area ?? 'speaking')

  async function submit(form: HTMLFormElement) {
    const minutes = formNumber(form, 'minutes')
    const date = formText(form, 'date') || D.today()
    const message = !isWhole(minutes, 1, 600) ? 'Use whole minutes, like 30.' : date > D.today() ? 'That day hasn’t happened yet.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    if (await actions.sessions.log({ area: chosen, minutes: minutes!, note: formText(form, 'note'), date })) closeDialog(form)
  }

  return (
    <Dialog desc="Class homework, a chat with a friend, a film: anything in Turkish outside the plan." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Log</SubmitButton></>} onClose={close} onSubmit={submit} title="Log practice">
      <div className="form-grid">
        <Segmented label="Skill" name="area" onChange={(value) => setChosen(value as PracticeArea)} options={PRACTICE_AREAS.map((a): [string, string] => [a, PRACTICE_AREA[a][2]])} value={chosen} />
        <div className="form-row">
          <Field defaultValue={30} error={error} label="Minutes" max={600} min={1} name="minutes" required type="number" />
          <Field defaultValue={D.today()} label="Day" name="date" type="date" />
        </div>
        <Field label="What was it?" name="note" optional placeholder={chosen === 'speaking' ? 'e.g. Coffee with Emre, only Turkish' : 'e.g. Class homework, unit 6'} />
      </div>
    </Dialog>
  )
}

/** Change the minutes of practice already logged, or remove it. */
export function SessionEditor({ session, title, close }: { session: PracticeSession; title: string; close: () => void }) {
  const actions = usePracticeActions()
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const minutes = formNumber(form, 'minutes')
    setError(isWhole(minutes, 1, 600) ? '' : 'Use whole minutes, like 25.')
    if (!isWhole(minutes, 1, 600)) return focusFirstInvalid(form)
    if (await actions.sessions.update(session, { minutes, note: formText(form, 'note') }, 'Practice updated')) closeDialog(form)
  }

  return (
    <Dialog
      className="dialog-sm"
      desc={`${PRACTICE_AREA[session.area][1]}, ${D.relative(session.date).toLowerCase()}`}
      foot={<>
        <button className="btn btn-ghost btn-danger" onClick={(event) => { const form = event.currentTarget.form!; void actions.sessions.remove(session).then((done) => { if (done !== undefined) closeDialog(form) }) }} type="button">Not done</button>
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>Save</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={title}
    >
      <div className="form-grid">
        <Field defaultValue={session.minutes} error={error} label="Minutes" max={600} min={1} name="minutes" type="number" />
        <Field defaultValue={session.note} label="Note" name="note" optional />
      </div>
    </Dialog>
  )
}

/* ---- Practice test result ---------------------------------------------------------------- */
export function TestEditor({ test, close }: { test?: PracticeTest | null; close: () => void }) {
  const { data } = useHop()
  const actions = usePracticeActions()
  const confirm = useConfirm()
  const max = test?.max ?? data.settings.languageTrack?.exam.sections ?? ITU_TOMER_EXAM.sections
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const date = formText(form, 'date')
    const scores: Partial<Record<LanguageSkill, number>> = {}
    const next: Errors = {}
    for (const skill of LANGUAGE_SKILLS) {
      const value = formNumber(form, skill)
      if (value === null) continue
      if (!isWhole(value, 0, max[skill])) next[skill] = `From 0 to ${max[skill]}.`
      else scores[skill] = value
    }
    if (!Object.keys(scores).length && !Object.keys(next).length) next.listening = 'Add the score of at least one section.'
    if (!date) next.date = 'Add the day you took it.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { date, title: formText(form, 'title'), scores, note: formText(form, 'note') }
    if (await (test ? actions.tests.update(test, fields) : actions.tests.add(fields))) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!test || !await confirm({ title: 'Delete this result?', body: `The practice test from ${D.short(test.date)} is deleted.`, confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.tests.remove(test)) closeDialog(form)
  }

  return (
    <Dialog
      desc="Leave out sections you didn’t take. A total out of 100 shows when all four are in."
      foot={<>
        {test && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">Delete</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{test ? 'Save' : 'Save result'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={test ? 'Practice test' : 'Add a practice test result'}
    >
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={test?.date ?? D.today()} error={errors.date} label="Taken on" name="date" type="date" />
          <Field defaultValue={test?.title} label="Paper" name="title" optional placeholder="e.g. İTÜ TÖMER sample B1" />
        </div>
        <div className="form-row">
          {LANGUAGE_SKILLS.map((skill) => <Field defaultValue={test?.scores[skill]} error={errors[skill]} id={`pt-${skill}`} key={skill} label={`${PRACTICE_AREA[skill][1]} (of ${max[skill]})`} max={max[skill]} min={0} name={skill} type="number" />)}
        </div>
        <Field defaultValue={test?.note} hint="What cost you points, and what you’ll change next week." label="Notes" name="note" optional rows={2} type="textarea" />
      </div>
    </Dialog>
  )
}

/* ---- Skill check ------------------------------------------------------------------------- */
type MetricField = { key: string; label: string; min: number; max: number; whole?: boolean; optional?: boolean; hint?: string }

const counted = (key: string, label: string, max: number, fields: Partial<MetricField> = {}): MetricField => ({ key, label, min: 0, max, whole: true, ...fields })

/** The counts each area asks for. Rates are worked out from them, so they're never typed in. */
const METRIC_FIELDS: Record<CheckArea, MetricField[]> = {
  speaking: [counted('seconds', 'Seconds recorded', 3600, { min: 10 }), counted('words', 'Words', 10000, { hint: 'From the transcript.' }), counted('errors', 'Errors', 1000, { hint: 'After correction.' })],
  writing: [counted('minutes', 'Minutes', 240, { min: 1 }), counted('words', 'Words', 10000, { min: 1 }), counted('errors', 'Errors', 1000), { key: 'rubric', label: 'Rubric (of 25)', min: 0, max: 25, optional: true, hint: 'The exam’s writing rubric.' }],
  listening: [counted('correct', 'Right', 1000), counted('total', 'Out of', 1000, { min: 1 })],
  reading: [counted('correct', 'Right', 1000), counted('total', 'Out of', 1000, { min: 1 }), counted('minutes', 'Minutes', 240, { min: 1, optional: true })],
  words: [
    { key: 'retention', label: 'True retention %', min: 0, max: 100, optional: true, hint: 'Anki’s True Retention, last month.' },
    counted('mature', 'Mature cards', 100000, { optional: true }),
    counted('known', 'Sample: known', 10000, { optional: true }),
    counted('sampled', 'Sample: words', 10000, { min: 1, optional: true, hint: 'From a frequency band.' }),
  ],
  grammar: [counted('correct', 'Right', 1000), counted('total', 'Out of', 1000, { min: 1 })],
}

const TASK_EXAMPLE: Record<CheckArea, string> = {
  speaking: 'e.g. 2-min monologue: my neighbourhood',
  writing: 'e.g. Email to a landlord, 150 words',
  listening: 'e.g. Dictation: Easy Turkish #120, 0:30–1:30',
  reading: 'e.g. İTÜ TÖMER sample B1, reading part',
  words: 'e.g. Anki stats + top-2000 sample',
  grammar: 'e.g. A2 structures test, unit 1–8',
}

const metricText = (check: LanguageCheck | null | undefined) => Object.fromEntries(Object.entries(check?.metrics ?? {}).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, String(v)]))

/** A measured result. The area comes first, then only that area's counts. */
export function CheckEditor({ check, close }: { check?: LanguageCheck | null; close: () => void }) {
  const actions = usePracticeActions()
  const [area, setArea] = useState<CheckArea>(check?.area ?? 'speaking')
  const [mode, setMode] = useState<ListeningMode>(check?.area === 'listening' ? (check.metrics as { mode: ListeningMode }).mode : 'dictation')
  const [values, setValues] = useState<Record<string, string>>(() => metricText(check))
  const [errors, setErrors] = useState<Errors>({})
  const fields = METRIC_FIELDS[area]

  /** The counts typed so far, and what is wrong with them. */
  function read(): { metrics: Record<string, number | string>; problems: Errors } {
    const metrics: Record<string, number | string> = area === 'listening' ? { mode } : {}
    const problems: Errors = {}
    for (const f of fields) {
      const raw = values[f.key]?.trim() ?? ''
      if (!raw) {
        if (!f.optional) problems[f.key] = 'Required.'
        continue
      }
      const value = Number(raw)
      if (!Number.isFinite(value) || value < f.min || value > f.max || (f.whole && !Number.isInteger(value))) problems[f.key] = f.whole ? `A whole number from ${f.min} to ${f.max}.` : `From ${f.min} to ${f.max}.`
      else metrics[f.key] = value
    }
    if (typeof metrics.correct === 'number' && typeof metrics.total === 'number' && metrics.correct > metrics.total) problems.correct = 'More than the total.'
    if (area === 'words') {
      if ((metrics.known === undefined) !== (metrics.sampled === undefined)) problems[metrics.known === undefined ? 'known' : 'sampled'] = 'Give both numbers of the sample.'
      else if (typeof metrics.known === 'number' && typeof metrics.sampled === 'number' && metrics.known > metrics.sampled) problems.known = 'More than the sample.'
      if (!Object.keys(metrics).length && !Object.keys(problems).length) problems.retention = 'Add retention, mature cards or a sample.'
    }
    return { metrics, problems }
  }

  const current = read()
  const preview = Object.keys(current.problems).length ? [] : checkValues({ area, metrics: current.metrics as unknown as CheckMetrics })

  async function submit(form: HTMLFormElement) {
    const date = formText(form, 'date')
    const next: Errors = { ...current.problems }
    if (!date) next.date = 'Add the day of the check.'
    else if (date > D.today()) next.date = 'That day hasn’t happened yet.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const level = formText(form, 'level')
    const judgedBy = formText(form, 'judgedBy')
    const saved = {
      date,
      area,
      metrics: current.metrics as unknown as CheckMetrics,
      task: formText(form, 'task'),
      level: level ? level as CefrLevel : null,
      judgedBy: judgedBy ? judgedBy as CheckJudge : null,
      link: formText(form, 'link'),
      note: formText(form, 'note'),
    }
    if (await (check ? actions.checks.update(check, saved) : actions.checks.add(saved))) closeDialog(form)
  }

  function remove(form: HTMLFormElement) {
    if (!check) return
    void actions.checks.remove(check).then((done) => { if (done !== undefined) closeDialog(form) })
  }

  const correctLabel = area === 'listening' && mode === 'dictation' ? ['Words right', 'Words in the passage'] : ['Right', 'Out of']

  return (
    <Dialog
      desc="Record the counts. Hop works out the rates, so checks stay comparable over the months."
      foot={<>
        {check && <button className="btn btn-ghost btn-danger" onClick={(event) => remove(event.currentTarget.form!)} type="button">Delete</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{check ? 'Save' : 'Save check'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={check ? `${CHECK_AREA[check.area][1]} check` : 'Log a skill check'}
    >
      <div className="form-grid">
        {!check && <Segmented label="Area" name="area" onChange={(value) => { setArea(value as CheckArea); setErrors({}) }} options={CHECK_AREAS.map((a): [string, string] => [a, CHECK_AREA[a][1]])} value={area} />}
        {area === 'listening' && <Segmented label="Kind" name="mode" onChange={(value) => setMode(value as ListeningMode)} options={[['dictation', 'Dictation'], ['questions', 'Exam questions']]} small value={mode} />}
        <div className="form-row check-metrics">
          {fields.map((f) => (
            <Field
              defaultValue={values[f.key]}
              error={errors[f.key]}
              hint={f.hint}
              id={`check-${f.key}`}
              key={`${area}-${f.key}`}
              label={f.key === 'correct' ? correctLabel[0]! : f.key === 'total' ? correctLabel[1]! : f.label}
              max={f.max}
              min={f.min}
              name={`m-${f.key}`}
              onChange={(value) => setValues((v) => ({ ...v, [f.key]: value }))}
              optional={f.optional}
              type="number"
            />
          ))}
        </div>
        <p aria-live="polite" className="small check-preview">{preview.length ? <strong>{preview.map(formatValue).join(' · ')}</strong> : <span className="muted">The result shows here as you type.</span>}</p>
        <div className="form-row">
          <Field defaultValue={check?.date ?? D.today()} error={errors.date} label="Day" name="date" type="date" />
          <Field defaultValue={check?.task} label="Task" name="task" optional placeholder={TASK_EXAMPLE[area]} />
        </div>
        <div className="form-row">
          <Field defaultValue={check?.level ?? ''} label="Level judged" name="level" optional options={[['', 'Not judged'], ...CEFR_LEVELS.map((l): [string, string] => [l, l])]} type="select" />
          <Field defaultValue={check?.judgedBy ?? ''} label="Judged or corrected by" name="judgedBy" optional options={[['', '–'], ...CHECK_JUDGES.map((j): [string, string] => [j, CHECK_JUDGE[j]])]} type="select" />
        </div>
        <Field defaultValue={check?.link} hint="Hop doesn’t keep audio or texts. Say where they are." label="Recording or text" name="link" optional placeholder="e.g. Recorder/2026-10-24 monologue.m4a" />
        <Field defaultValue={check?.note} label="Notes" name="note" optional rows={2} type="textarea" />
      </div>
    </Dialog>
  )
}
