// İTÜ dialogs: terms, courses, graded items, instructors, the library, ideas and the handbook.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { currentTerm, parseGrading, splitList, standing, taking } from '../lib/uni.ts'
import type { Assessment, AssessmentType, ClassSlot, Contact, Course, Idea, KeyDate, LetterGrade, Pin, Program, Resource, ResourceKind, Term } from '../lib/types.ts'
import { ASSESSMENT_TYPES, IDEA_KINDS, IDEA_STAGES, IDEA_STAGE_HINT, IDEA_STAGE_LABEL, KEY_DATE_KINDS, PIN_KINDS, RESOURCE_FILE_ACCEPT, RESOURCE_FILE_MAX_BYTES, RESOURCE_KINDS, initials, sizeLabel } from '../lib/labels.ts'
import { navigate } from '../lib/router.ts'
import { useUniActions } from '../store/uni-actions.ts'
import type { CourseFields } from '../store/uni-actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, FieldError, FilePicker, SubmitButton } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>
const LETTER_GRADES: LetterGrade[] = ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FF', 'VF']
const isLink = (value: string) => /^https?:\/\/\S+\.\S+/.test(value)
const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value))

/* ---- Terms --------------------------------------------------------------------------------- */
export function TermEditor({ term, close }: { term?: Term | null; close: () => void }) {
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const fields = { name: formText(form, 'name'), start: String(fd.get('start') || ''), end: String(fd.get('end') || '') }
    const next: Errors = {}
    if (!fields.name) next.name = 'Name the term, like “Fall 2026–27”.'
    if (!fields.start) next.start = 'Pick the first day of classes.'
    if (!fields.end) next.end = 'Pick the last day, including finals.'
    else if (fields.start && fields.end < fields.start) next.end = 'The term can’t end before it starts.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    if (await actions.terms.save(term ?? null, fields)) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc="Copy the dates from the SIS academic calendar." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{term ? 'Save term' : 'Add term'}</SubmitButton></>} onClose={close} onSubmit={submit} title={term ? 'Edit term' : 'Add term'}>
      <div className="form-grid">
        <Field defaultValue={term?.name} error={errors.name} label="Term" name="name" placeholder="Fall 2026–27" required />
        <div className="form-row">
          <Field defaultValue={term?.start} error={errors.start} label="Starts" name="start" type="date" />
          <Field defaultValue={term?.end} error={errors.end} hint="Include the final exams" label="Ends" name="end" type="date" />
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Courses --------------------------------------------------------------------------------- */
const WEEKDAYS: [string, string][] = [1, 2, 3, 4, 5, 6].map((day) => [String(day), D.DAYS[day]!])
const STATUS_OPTIONS: [Course['status'], string][] = [['taking', 'Taking this term'], ['planned', 'Planned'], ['interested', 'Interested'], ['completed', 'Completed']]
const GRADING_HINT = 'One per line: name and weight. e.g.\nHomework 20\nMidterm 30\nFinal 50'

function SlotRows({ slots, onChange }: { slots: ClassSlot[]; onChange: (slots: ClassSlot[]) => void }) {
  const set = (index: number, change: Partial<ClassSlot>) => onChange(slots.map((slot, i) => (i === index ? { ...slot, ...change } : slot)))
  return (
    <div className="slot-list">
      {slots.map((slot, index) => (
        <div className="slot-row" key={index}>
          <div className="field"><label htmlFor={`slot-day-${index}`}>Day</label><select className="select" id={`slot-day-${index}`} onChange={(event) => set(index, { day: Number(event.target.value) })} value={String(slot.day)}>{WEEKDAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor={`slot-start-${index}`}>Starts</label><input className="input" id={`slot-start-${index}`} onChange={(event) => set(index, { start: event.target.value })} type="time" value={slot.start} /></div>
          <div className="field"><label htmlFor={`slot-end-${index}`}>Ends</label><input className="input" id={`slot-end-${index}`} onChange={(event) => set(index, { end: event.target.value })} type="time" value={slot.end} /></div>
          <div className="field"><label htmlFor={`slot-room-${index}`}>Room</label><input className="input" id={`slot-room-${index}`} maxLength={40} onChange={(event) => set(index, { room: event.target.value })} placeholder="EEB 5302" value={slot.room} /></div>
          <button aria-label={`Remove the ${D.DAYS[slot.day]} class`} className="icon-btn" onClick={() => onChange(slots.filter((_, i) => i !== index))} type="button"><Icon name="trash" /></button>
        </div>
      ))}
      {slots.length < 4 && <button className="btn btn-sm" onClick={() => onChange([...slots, { day: slots.at(-1)?.day ?? 1, start: '09:30', end: '12:30', room: '' }])} style={{ justifySelf: 'start' }} type="button"><Icon className="icon-sm" name="plus" />{slots.length ? 'Add another class' : 'Add a weekly class'}</button>}
    </div>
  )
}

export function CourseEditor({ course, close }: { course?: Course | null; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})
  const [slots, setSlots] = useState<ClassSlot[]>(course?.schedule ?? [{ day: 1, start: '09:30', end: '12:30', room: '' }])
  const [instructor, setInstructor] = useState(course?.instructorId ?? '')
  const instructors: [string, string][] = [['', 'Not set'], ...data.contacts.filter((c) => c.kind === 'instructor' || c.id === course?.instructorId).map((c): [string, string] => [c.id, c.name]), ['__new', 'Someone new…']]
  const termId = course ? course.termId ?? '' : currentTerm(data.terms, D.today())?.id ?? ''

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const code = formText(form, 'code').toUpperCase().replace(/\s+/g, ' ')
    const name = formText(form, 'name')
    const newInstructor = instructor === '__new' ? formText(form, 'newInstructor') : ''
    const ninovaUrl = formText(form, 'ninovaUrl')
    const minInTerm = numberOrNull(formText(form, 'minInTerm'))
    const maxAbsences = numberOrNull(formText(form, 'maxAbsences'))
    const vfRule = formText(form, 'vfRule')
    const next: Errors = {}
    if (!code) next.code = 'Add the course code.'
    else if (!/^[A-ZÇĞİÖŞÜ]{2,4} ?\d{3}[A-Z]?$/.test(code)) next.code = 'Use the SIS format, like “BLG 527E”.'
    if (!name) next.name = 'Add the course name.'
    if (instructor === '__new' && !newInstructor) next.newInstructor = 'Add the instructor’s name.'
    if (ninovaUrl && !isLink(ninovaUrl)) next.ninovaUrl = 'Use a full link starting with https://'
    if (minInTerm !== null && (Number.isNaN(minInTerm) || minInTerm < 0 || minInTerm > 100)) next.minInTerm = 'Use 0 to 100.'
    if (maxAbsences !== null && (!Number.isInteger(maxAbsences) || maxAbsences < 0 || maxAbsences > 60)) next.maxAbsences = 'Use a whole number.'
    if (slots.some((slot) => !slot.start || !slot.end || slot.end <= slot.start)) next.slots = 'Each class needs a start time before its end time.'
    let grading: { title: string; type: AssessmentType; weight: number }[] = []
    if (!course) {
      const parsed = parseGrading(formText(form, 'grading'))
      if ('error' in parsed) next.grading = parsed.error
      else grading = parsed.items
    }
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)

    const fields: CourseFields = {
      code,
      name,
      crn: formText(form, 'crn') || null,
      status: fd.get('status') as Course['status'],
      termId: String(fd.get('termId') || '') || null,
      instructorId: instructor && instructor !== '__new' ? instructor : null,
      schedule: slots.map((slot) => ({ ...slot, room: slot.room.trim() })),
      ninovaUrl: ninovaUrl || null,
      why: formText(form, 'why') || null,
      vf: minInTerm === null && maxAbsences === null && !vfRule ? null : { rule: vfRule || 'From the syllabus', minInTerm, maxAbsences },
    }
    const saved = await actions.courses.save(course ?? null, fields, grading, newInstructor)
    if (!saved) return
    closeDialog(form)
    if (!course) navigate(`#/itu/courses/${saved.saved.id}`)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{course ? 'Save changes' : 'Add course'}</SubmitButton></>} onClose={close} onSubmit={submit} title={course ? 'Edit course' : 'Add course'}>
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={course?.code} error={errors.code} label="Course code" name="code" placeholder="BLG 527E" required />
          <Field defaultValue={course?.crn} label="CRN" name="crn" optional />
        </div>
        <Field defaultValue={course?.name} error={errors.name} label="Course name" name="name" placeholder="Machine Learning" required />
        <div className="form-row">
          <Field defaultValue={course?.status ?? 'taking'} label="Status" name="status" options={STATUS_OPTIONS} type="select" />
          <Field defaultValue={termId} label="Term" name="termId" options={[['', 'No term yet'], ...data.terms.map((t): [string, string] => [t.id, t.name])]} type="select" />
        </div>
        <div className="form-row">
          <Field defaultValue={instructor} label="Instructor" name="instructorId" onChange={setInstructor} options={instructors} type="select" />
          {instructor === '__new' && <Field error={errors.newInstructor} label="Instructor’s name" name="newInstructor" placeholder="Dr. …" />}
        </div>
        <fieldset className="field">
          <legend className="field-label">Weekly classes <span className="optional">(optional)</span></legend>
          <SlotRows onChange={setSlots} slots={slots} />
          <FieldError error={errors.slots} />
        </fieldset>
        <Field defaultValue={course?.ninovaUrl ?? 'https://ninova.itu.edu.tr'} error={errors.ninovaUrl} label="Ninova page" name="ninovaUrl" optional type="url" />
        <details className="disclosure" open={Boolean(course?.vf) || undefined}>
          <summary>Final eligibility (VF)</summary>
          <div className="form-grid" style={{ marginTop: 'var(--s-3)' }}>
            <div className="form-row">
              <Field defaultValue={course?.vf?.minInTerm ?? ''} error={errors.minInTerm} hint="Out of 100" label="Minimum in-term average" max={100} min={0} name="minInTerm" optional type="number" />
              <Field defaultValue={course?.vf?.maxAbsences ?? ''} error={errors.maxAbsences} label="Absences allowed" max={60} min={0} name="maxAbsences" optional type="number" />
            </div>
            <Field defaultValue={course?.vf?.rule ?? ''} label="Rule in the syllabus’s words" name="vfRule" optional placeholder="In-term average of at least 30 and 70% attendance" />
          </div>
        </details>
        {course
          ? <Field defaultValue={course.why} label="Why this course" name="why" optional />
          : <Field error={errors.grading} hint="Add dates later on the course page." label="Grading from the syllabus" name="grading" optional placeholder={GRADING_HINT} rows={4} type="textarea" />}
      </div>
    </Dialog>
  )
}

export function CompleteCourse({ course, close }: { course: Course; close: () => void }) {
  const actions = useUniActions()
  const s = standing(course)

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    if (await actions.courses.complete(course, fd.get('grade') as LetterGrade, Boolean(fd.get('evidence')))) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc={s.average !== null ? `Your weighted average was ${s.average} on ${s.gradedWeight}% graded.` : undefined} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Mark completed</SubmitButton></>} onClose={close} onSubmit={submit} title={`Complete ${course.code}`}>
      <div className="form-grid">
        <Field defaultValue="BB" label="Letter grade" name="grade" options={LETTER_GRADES} type="select" />
        <label className="check-line"><input defaultChecked name="evidence" type="checkbox" /> Add to Evidence in Growth</label>
      </div>
    </Dialog>
  )
}

/* ---- Graded items ---------------------------------------------------------------------------- */
export function AssessmentEditor({ course, item, close }: { course?: Course | null; item?: Assessment | null; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})
  const choices = taking(data.courses).filter((c) => c.id !== course?.id).concat(course ? [course] : [])
  const first = course ?? choices[0]

  if (!first) {
    return (
      <Dialog className="dialog-sm" foot={<button className="btn" data-close type="button">Close</button>} onClose={close} title="Add deadline">
        <p className="muted">Add a course you’re taking this term first. Deadlines belong to a course.</p>
      </Dialog>
    )
  }

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const target = data.courses.find((c) => c.id === fd.get('courseId'))!
    const title = formText(form, 'title')
    const weight = Number(fd.get('weight'))
    const others = target.grading.filter((a) => a.id !== item?.id).reduce((sum, a) => sum + a.weight, 0)
    const next: Errors = {}
    if (!title) next.title = 'Add a title, like “Homework 3”.'
    if (!Number.isInteger(weight) || weight < 1 || weight > 100) next.weight = 'Use the weight from the syllabus, 1 to 100.'
    else if (others + weight > 100) next.weight = `${target.code} weights would add up to ${others + weight}%. Check the syllabus or edit another item.`
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { title, type: fd.get('type') as AssessmentType, weight, due: String(fd.get('due') || '') || null, time: String(fd.get('time') || '') || null }
    const saved = item && course
      ? await actions.grading.update(course, item, { ...fields, ...(target.id !== course.id ? { courseId: target.id } : {}) })
      : await actions.grading.add(target, fields)
    if (saved) closeDialog(form)
  }

  return (
    <Dialog desc={item ? undefined : 'A graded item from the syllabus: homework, quiz, exam, project.'} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{item ? 'Save changes' : 'Add deadline'}</SubmitButton></>} initialFocus="#as-title" onClose={close} onSubmit={submit} title={item ? 'Edit deadline' : 'Add deadline'}>
      <div className="form-grid">
        <Field defaultValue={first.id} id="as-course" label="Course" name="courseId" options={choices.map((c): [string, string] => [c.id, `${c.code} ${c.name}`])} type="select" />
        <Field defaultValue={item?.title} error={errors.title} id="as-title" label="Title" name="title" placeholder="e.g. Homework 3" required />
        <div className="form-row">
          <Field defaultValue={item?.type ?? 'homework'} label="Type" name="type" options={ASSESSMENT_TYPES} type="select" />
          <Field defaultValue={item?.weight} error={errors.weight} label="Weight (%)" max={100} min={1} name="weight" type="number" />
        </div>
        <div className="form-row">
          <Field defaultValue={item?.due} label="Date" name="due" optional type="date" />
          <Field defaultValue={item ? item.time : '23:59'} label="Time" name="time" optional type="time" />
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Instructors ------------------------------------------------------------------------------ */
export function PlaybookEditor({ contact, close }: { contact: Contact; close: () => void }) {
  const actions = useUniActions()
  const p = contact.playbook

  async function submit(form: HTMLFormElement) {
    const playbook = {
      exams: formText(form, 'exams'),
      values: formText(form, 'values'),
      office: formText(form, 'office'),
      email: formText(form, 'email'),
      tips: formText(form, 'tips').split('\n').map((tip) => tip.trim()).filter(Boolean),
    }
    if (await actions.people.savePlaybook(contact, playbook, splitList(formText(form, 'interests')))) closeDialog(form)
  }

  return (
    <Dialog desc="Your notes, plus what seniors tell you. Only you see this." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save</SubmitButton></>} onClose={close} onSubmit={submit} title={`Working with ${contact.name}`}>
      <div className="form-grid">
        <Field defaultValue={p?.exams} label="Exams" name="exams" placeholder="Style, length, what comes up" rows={2} type="textarea" />
        <Field defaultValue={p?.values} label="What they value" name="values" rows={2} type="textarea" />
        <div className="form-row">
          <Field defaultValue={p?.office} label="Office hours" name="office" />
          <Field defaultValue={p?.email} label="Emailing" name="email" />
        </div>
        <Field defaultValue={p?.tips.join('\n')} hint="One per line" label="Tips" name="tips" rows={3} type="textarea" />
        <Field defaultValue={contact.interests.join(', ')} hint="Comma separated. Helps when you look for an advisor." label="Research interests" name="interests" />
      </div>
    </Dialog>
  )
}

/* ---- Library ------------------------------------------------------------------------------------ */
const KIND_OPTIONS = Object.entries(RESOURCE_KINDS).map(([kind, [, label]]): [string, string] => [kind, label])

function courseOptions(courses: Course[]): [string, string][] {
  const suffix: Record<Course['status'], string> = { taking: '', planned: ' (next term)', interested: ' (interested)', completed: ' (completed)' }
  return [['', 'Not linked to a course'], ...courses.map((c): [string, string] => [c.id, `${c.code} ${c.name}${suffix[c.status]}`])]
}

/** Add a library item, or edit one that isn't a note. A link or a file is needed; notes need text. */
export function ResourceEditor({ resource, defaults = {}, close }: { resource?: Resource | null; defaults?: { kind?: ResourceKind; courseId?: string; title?: string; url?: string; topics?: string[] }; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [kind, setKind] = useState<ResourceKind>(resource?.kind ?? defaults.kind ?? 'link')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const note = kind === 'note'

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const url = formText(form, 'url')
    const body = String(fd.get('body') ?? '')
    const next: Errors = {}
    if (!title) next.title = 'Give it a title you’ll recognise later.'
    if (!note && url && !isLink(url)) next.url = 'Use a full link starting with https://'
    if (note && !body.trim()) next.body = 'Write something in the note.'
    if (!note && !url && !file && !resource?.file) next.source = 'Add a link or choose a file.'
    setErrors((current) => ({ ...next, ...(current.file && !file ? { file: current.file } : {}) }))
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { kind, title, url: note ? null : url || null, courseId: String(fd.get('courseId') || '') || null, topics: splitList(formText(form, 'topics')), ...(note ? { body } : {}) }
    const saved = resource
      ? await actions.library.update(resource, fields, 'Saved') && (!file || await actions.library.attachFile(resource, file))
      : await actions.library.add(fields, note ? null : file)
    if (saved) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{resource ? 'Save changes' : note ? 'Save note' : 'Add'}</SubmitButton></>} initialFocus="#rs-title" onClose={close} onSubmit={submit} title={resource ? 'Edit library item' : note ? 'New note' : 'Add to library'}>
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={kind} label="Type" name="kind" onChange={(value) => setKind(value as ResourceKind)} options={KIND_OPTIONS} type="select" />
          <Field defaultValue={resource?.courseId ?? defaults.courseId ?? ''} label="Course" name="courseId" options={courseOptions(data.courses)} type="select" />
        </div>
        <Field defaultValue={resource?.title ?? defaults.title} error={errors.title} id="rs-title" label="Title" name="title" required />
        {note
          ? <div className="field"><label htmlFor="rs-body">Note</label><textarea aria-invalid={errors.body ? true : undefined} className="textarea note-body" defaultValue={resource?.body ?? ''} id="rs-body" name="body" rows={10} /><FieldError error={errors.body} /></div>
          : (
            <>
              <Field defaultValue={resource?.url ?? defaults.url} error={errors.url} label="Link" name="url" optional placeholder="https://" type="url" />
              <FilePicker
                accept={RESOURCE_FILE_ACCEPT}
                current={resource?.file ? { name: resource.file.name, meta: sizeLabel(resource.file.size) } : null}
                error={errors.file}
                hint={`PDF, slides, Word, zip, notebook or image, up to ${sizeLabel(RESOURCE_FILE_MAX_BYTES)}. Stored on your Hop server.`}
                label="Or a file"
                maxBytes={RESOURCE_FILE_MAX_BYTES}
                onChange={(chosen, problem) => {
                  setFile(chosen)
                  setErrors((current) => ({ ...current, file: problem ?? '', source: '' }))
                  const titleInput = document.getElementById('rs-title') as HTMLInputElement | null
                  if (chosen && titleInput && !titleInput.value) titleInput.value = chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
                }}
                optional
                value={file}
              />
              <FieldError error={errors.source} />
            </>
          )}
        <Field defaultValue={(resource?.topics ?? defaults.topics ?? []).join(', ')} hint="Comma separated, e.g. NLP, Exams" label="Topics" name="topics" optional />
      </div>
    </Dialog>
  )
}

/** A note opens in a drawer to read and edit. */
export function NoteDrawer({ resource, close }: { resource: Resource; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [error, setError] = useState('')
  const course = data.courses.find((c) => c.id === resource.courseId)

  async function submit(form: HTMLFormElement) {
    const title = formText(form, 'title')
    setError(title ? '' : 'Give the note a title.')
    if (!title) return focusFirstInvalid(form)
    const body = String(new FormData(form).get('body') ?? '')
    if (await actions.library.update(resource, { title, body, topics: splitList(formText(form, 'topics')) }, 'Note saved')) closeDialog(form)
  }

  return (
    <Dialog className="drawer" desc={course ? `${course.code} ${course.name}` : 'General note'} foot={<><span className="xs muted">Added {D.relative(D.ymdOf(resource.createdAt)).toLowerCase()}</span><span className="spacer" /><button className="btn" data-close type="button">Close</button><SubmitButton>Save note</SubmitButton></>} initialFocus="#note-body" onClose={close} onSubmit={submit} title={resource.title}>
      <div className="form-grid">
        <Field defaultValue={resource.title} error={error} id="note-title" label="Title" name="title" />
        <div className="field"><label htmlFor="note-body">Note</label><textarea className="textarea note-body" defaultValue={resource.body} id="note-body" name="body" rows={14} /></div>
        <Field defaultValue={resource.topics.join(', ')} hint="Comma separated" id="note-topics" label="Topics" name="topics" optional />
      </div>
    </Dialog>
  )
}

export function MoveResource({ resource, close }: { resource: Resource; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()

  async function submit(form: HTMLFormElement) {
    const courseId = String(new FormData(form).get('courseId') || '') || null
    if (await actions.library.update(resource, { courseId }, 'Moved', true)) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Move</SubmitButton></>} onClose={close} onSubmit={submit} title="Move to course">
      <Field defaultValue={resource.courseId ?? ''} label="Course" name="courseId" options={courseOptions(data.courses)} type="select" />
    </Dialog>
  )
}

/* ---- Ideas -------------------------------------------------------------------------------------- */
export function IdeaEditor({ defaults = {}, close }: { defaults?: Partial<Idea>; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    setError(title ? '' : 'Name the idea in a few words.')
    if (!title) return focusFirstInvalid(form)
    const courseId = String(fd.get('courseId') || '')
    const saved = await actions.ideas.add({
      title,
      kind: fd.get('kind') as Idea['kind'],
      question: formText(form, 'question'),
      why: formText(form, 'why'),
      courseIds: courseId ? [courseId] : [],
      resourceIds: defaults.resourceIds ?? [],
      findIds: defaults.findIds ?? [],
    })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog desc="Most ideas start as a spark. Writing the question down is what makes them useful later." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save idea</SubmitButton></>} onClose={close} onSubmit={submit} title="New idea">
      <div className="form-grid">
        <Field defaultValue={defaults.title} error={error} label="Idea" name="title" placeholder="e.g. Small LLMs for Turkish legal retrieval" required />
        <Field defaultValue={defaults.question} label="Research question" name="question" optional placeholder="Can X do Y under Z?" rows={2} type="textarea" />
        <div className="form-row">
          <Field defaultValue={defaults.kind ?? 'thesis'} label="Kind" name="kind" options={IDEA_KINDS} type="select" />
          <Field defaultValue={defaults.courseIds?.[0] ?? ''} label="Came from course" name="courseId" options={[['', 'None'], ...data.courses.map((c): [string, string] => [c.id, `${c.code} ${c.name}`])]} type="select" />
        </div>
        <Field defaultValue={defaults.why} label="Why it matters to you" name="why" optional />
      </div>
    </Dialog>
  )
}

export function IdeaDrawer({ idea: initial, close }: { idea: Idea; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const confirm = useConfirm()
  const idea = data.ideas.find((i) => i.id === initial.id) ?? initial
  const [nextStep, setNextStep] = useState(idea.nextStep)
  const [linkResource, setLinkResource] = useState('')
  const [linkAdvisor, setLinkAdvisor] = useState('')
  const current = IDEA_STAGES.indexOf(idea.stage)
  const resources = idea.resourceIds.map((id) => data.resources.find((r) => r.id === id)).filter((r): r is Resource => Boolean(r))
  const advisors = idea.advisorIds.map((id) => data.contacts.find((c) => c.id === id)).filter((c): c is Contact => Boolean(c))
  const courses = idea.courseIds.map((id) => data.courses.find((c) => c.id === id)).filter((c): c is Course => Boolean(c))
  const finds = idea.findIds.map((id) => data.finds.find((f) => f.id === id)).filter((f) => f !== undefined)
  const linkable = data.resources.filter((r) => !idea.resourceIds.includes(r.id))
  const people = data.contacts.filter((c) => (c.kind === 'instructor' || c.kind === 'mentor') && !idea.advisorIds.includes(c.id))
  const project = data.projects.find((p) => p.id === idea.projectId)

  return (
    <Dialog className="drawer" desc={`${IDEA_KINDS.find(([kind]) => kind === idea.kind)?.[1] ?? ''} idea`} foot={false} onClose={close} title={idea.title}>
      <div className="stack">
        <div className="section">
          <div aria-label="Stage" className="stepper" role="list">
            {IDEA_STAGES.map((stage, index) => (
              <button
                aria-current={index === current ? 'step' : undefined}
                className={`step ${idea.stage !== 'parked' && index < current ? 'done' : index === current ? 'current' : ''}`}
                key={stage}
                onClick={() => { if (stage !== idea.stage) void actions.ideas.setStage(idea, stage, `Moved to ${IDEA_STAGE_LABEL[stage]}`) }}
                role="listitem"
                type="button"
              ><span className="step-dot" />{IDEA_STAGE_LABEL[stage]}</button>
            ))}
          </div>
          <p className="xs muted">{IDEA_STAGE_HINT[idea.stage]}</p>
        </div>
        {idea.question && <div><h3 className="small">Research question</h3><p className="idea-q">{idea.question}</p></div>}
        {idea.why && <div><h3 className="small">Why it matters</h3><p className="small" style={{ lineHeight: 'var(--lh-read)' }}>{idea.why}</p></div>}
        <div className="field">
          <label htmlFor="idea-next">Next step</label>
          <div className="copy-row">
            <input className="input" id="idea-next" maxLength={200} onChange={(event) => setNextStep(event.target.value)} placeholder="The smallest useful thing to do next" value={nextStep} />
            <button className="btn" disabled={nextStep.trim() === idea.nextStep} onClick={() => void actions.ideas.saveNextStep(idea, nextStep.trim(), false)} type="button">Save</button>
            <button className="btn" disabled={!nextStep.trim()} onClick={() => void actions.ideas.saveNextStep(idea, nextStep.trim(), true)} type="button">Save as task</button>
          </div>
        </div>

        <section className="section">
          <div className="section-head"><h3>Papers and resources <span className="count">{resources.length}</span></h3></div>
          {resources.length > 0 && <ul className="link-list">{resources.map((r) => <li key={r.id}><a data-close href={`#/itu/library?item=${r.id}`}><Icon className="icon-sm" name={RESOURCE_KINDS[r.kind][0]} />{r.title}</a></li>)}</ul>}
          {linkable.length > 0 && (
            <div className="copy-row">
              <label className="visually-hidden" htmlFor="idea-res">Link a library item</label>
              <select className="select" id="idea-res" onChange={(event) => setLinkResource(event.target.value)} value={linkResource}><option value="">Link something from your library…</option>{linkable.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
              <button className="btn" disabled={!linkResource} onClick={() => { void actions.ideas.update(idea, { resourceIds: [...idea.resourceIds, linkResource] }, 'Linked'); setLinkResource('') }} type="button">Link</button>
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-head"><h3>Possible advisors</h3></div>
          {advisors.length
            ? <ul className="people-mini">{advisors.map((a) => <li key={a.id}><span className="avatar avatar-sm">{initials(a.name.replace(/^((Prof|Doç|Dr|Assoc|Asst)\.\s*)+/g, ''))}</span><span className="small"><strong>{a.name}</strong></span><span className="xs muted">{a.interests.join(', ')}</span></li>)}</ul>
            : <p className="small muted">Who could supervise or advise on this?</p>}
          {people.length > 0 && (
            <div className="copy-row">
              <label className="visually-hidden" htmlFor="idea-adv">Add a possible advisor</label>
              <select className="select" id="idea-adv" onChange={(event) => setLinkAdvisor(event.target.value)} value={linkAdvisor}><option value="">Add a person…</option>{people.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="btn" disabled={!linkAdvisor} onClick={() => { void actions.ideas.update(idea, { advisorIds: [...idea.advisorIds, linkAdvisor] }, 'Added as a possible advisor'); setLinkAdvisor('') }} type="button">Add</button>
            </div>
          )}
        </section>

        {(courses.length > 0 || finds.length > 0) && (
          <section className="section">
            <div className="section-head"><h3>Came from</h3></div>
            <div className="tag-list">
              {courses.map((c) => <a className="tag" data-close href={`#/itu/courses/${c.id}`} key={c.id}>{c.code}</a>)}
              {finds.map((f) => <a className="tag" data-close href="#/growth/radar?status=converted" key={f.id}><Icon className="icon-sm" name="radar" /> {f.title}</a>)}
            </div>
          </section>
        )}

        <div className="btn-row idea-actions">
          {project
            ? <a className="btn" data-close href={`#/growth/projects?project=${project.id}`}><Icon className="icon-sm" name="code" />Open project</a>
            : ['validated', 'proposed', 'active'].includes(idea.stage) && <button className="btn btn-primary" onClick={() => void actions.ideas.startProject(idea)} type="button"><Icon className="icon-sm" name="code" />Start as a project</button>}
          {idea.stage !== 'parked' && <button className="btn" onClick={() => void actions.ideas.setStage(idea, 'parked', 'Idea parked. Its links are kept.')} type="button"><Icon className="icon-sm" name="pause" />Park it</button>}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={async (event) => {
            const form = event.currentTarget.form!
            if (!await confirm({ title: `Delete “${idea.title}”?`, body: 'The idea and its next step are deleted. Linked papers, people and courses stay where they are.', confirmLabel: 'Delete idea', tone: 'danger' })) return
            if (await actions.ideas.remove(idea)) closeDialog(form)
          }} style={{ color: 'var(--danger)' }} type="button"><Icon className="icon-sm" name="trash" />Delete</button>
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Thesis -------------------------------------------------------------------------------------- */
export function AdvisorPicker({ program, close }: { program: Program; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const people = data.contacts.filter((c) => c.kind === 'instructor' || c.kind === 'mentor')

  async function submit(form: HTMLFormElement) {
    const advisorId = String(new FormData(form).get('advisorId') || '')
    if (advisorId && await actions.thesis.setAdvisor(advisorId, program)) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" foot={<><button className="btn" data-close type="button">Cancel</button>{people.length > 0 && <SubmitButton>Set advisor</SubmitButton>}</>} onClose={close} onSubmit={submit} title="Set your advisor">
      {people.length
        ? <Field defaultValue={program.advisorId ?? people[0]!.id} label="Advisor" name="advisorId" options={people.map((c): [string, string] => [c.id, c.name])} type="select" />
        : <p className="muted">Add instructors to your courses first. Your advisor is chosen from them and your mentors.</p>}
    </Dialog>
  )
}

/* ---- Handbook ------------------------------------------------------------------------------------- */
export function KeyDateEditor({ close }: { close: () => void }) {
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const date = String(fd.get('date') || '')
    const next: Errors = {}
    if (!title) next.title = 'Describe the date.'
    if (!date) next.date = 'Pick the date.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    if (await actions.handbook.addDate({ title, date, kind: fd.get('kind') as KeyDate['kind'] })) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add date</SubmitButton></>} onClose={close} onSubmit={submit} title="Add key date">
      <div className="form-grid">
        <Field error={errors.title} label="What" name="title" placeholder="e.g. Last day to withdraw" required />
        <div className="form-row">
          <Field error={errors.date} label="Date" name="date" type="date" />
          <Field defaultValue="deadline" label="Kind" name="kind" options={KEY_DATE_KINDS.map(([kind, label]): [string, string] => [kind, label])} type="select" />
        </div>
      </div>
    </Dialog>
  )
}

export function PinEditor({ pin, close }: { pin?: Pin | null; close: () => void }) {
  const actions = useUniActions()
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const title = formText(form, 'title')
    setError(title ? '' : 'Add a title.')
    if (!title) return focusFirstInvalid(form)
    if (await actions.handbook.savePin(pin ?? null, { title, kind: new FormData(form).get('kind') as Pin['kind'], body: formText(form, 'body') })) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{pin ? 'Save' : 'Pin'}</SubmitButton></>} onClose={close} onSubmit={submit} title={pin ? 'Edit pinned info' : 'Pin something'}>
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={pin?.title} error={error} label="Title" name="title" required />
          <Field defaultValue={pin?.kind ?? 'rule'} label="Kind" name="kind" options={PIN_KINDS.map(([kind, label]): [string, string] => [kind, label])} type="select" />
        </div>
        <Field defaultValue={pin?.body} label="Details" name="body" rows={4} type="textarea" />
      </div>
    </Dialog>
  )
}

export function UniLinkEditor({ close }: { close: () => void }) {
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const title = formText(form, 'title')
    const url = formText(form, 'url')
    const next: Errors = {}
    if (!title) next.title = 'Name the link.'
    if (!isLink(url)) next.url = 'Use a full link starting with https://'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    if (await actions.handbook.addLink({ title, url })) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add link</SubmitButton></>} onClose={close} onSubmit={submit} title="Add link">
      <div className="form-grid">
        <Field error={errors.title} label="Name" name="title" required />
        <Field error={errors.url} label="Link" name="url" placeholder="https://" type="url" />
      </div>
    </Dialog>
  )
}
