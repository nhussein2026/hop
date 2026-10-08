// Career dialogs: opportunities, activity, closing, people and resume versions.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { STAGE_LABEL, orgOf, rank } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Contact, ContactKind, Interaction, Opportunity, OpportunityActivityType, OpportunityStage, OpportunityType, Resume, WorkMode } from '../lib/types.ts'
import { ACTIVITY_TYPES, OPPORTUNITY_TYPES, RESUME_FILE_LABEL, RESUME_MAX_BYTES, interactionIcon, sizeLabel } from '../lib/labels.ts'
import { useActions } from '../store/actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Banner, Dialog, Field, FilePicker, SubmitButton } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>

const WORK_MODES: [WorkMode, string][] = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['on-site', 'On-site']]

export function OpportunityEditor({ opportunity: o, close }: { opportunity?: Opportunity | null; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})
  const [duplicate, setDuplicate] = useState<Opportunity>()

  function checkDuplicate(form: HTMLFormElement) {
    const title = formText(form, 'title').toLowerCase()
    const org = formText(form, 'org').toLowerCase()
    setDuplicate(title && org ? data.opportunities.find((x) => x.id !== o?.id && (x.organization ?? '').toLowerCase() === org && x.title.toLowerCase() === title) : undefined)
  }

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const url = formText(form, 'url')
    const fields = {
      title: formText(form, 'title'),
      organization: formText(form, 'org'),
      type: fd.get('type') as OpportunityType,
      deadline: String(fd.get('deadline') || '') || null,
      url: url || null,
      location: formText(form, 'location') || null,
      workMode: (fd.get('workMode') as WorkMode) || null,
      source: formText(form, 'source') || null,
      priority: fd.get('priority') as Opportunity['priority'],
    }
    const next: Errors = {}
    if (!fields.title) next.title = 'Add the role or program name.'
    if (!fields.organization) next.org = 'Add the organization.'
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) next.url = 'Use a full link starting with https://'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.opportunities.save(o ?? null, fields)
    if (!saved) return
    closeDialog(form)
    if (!o) navigate(`#/career/${saved.id}`)
  }

  return (
    <Dialog
      desc={o ? undefined : 'Save it now, even if you’re not sure you’ll apply.'}
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{o ? 'Save changes' : 'Save opportunity'}</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title={o ? 'Edit opportunity' : 'Add opportunity'}
    >
      <div className="form-grid" onInput={(event) => checkDuplicate(event.currentTarget.closest('form')!)}>
        <div className="form-row">
          <Field defaultValue={o?.title} error={errors.title} label="Role or program" name="title" placeholder="e.g. Backend Engineer" required />
          <Field defaultValue={o?.organization} error={errors.org} label="Organization" name="org" placeholder="e.g. Insider" required />
        </div>
        {duplicate && <Banner icon="alert" tone="warning">You already track <a data-close href={`#/career/${duplicate.id}`}>{orgOf(duplicate)}: {duplicate.title}</a> ({STAGE_LABEL[duplicate.stage]}).</Banner>}
        <div className="form-row">
          <Field defaultValue={o?.type ?? 'job'} label="Type" name="type" options={OPPORTUNITY_TYPES} type="select" />
          <Field defaultValue={o?.deadline} label="Application deadline" name="deadline" optional type="date" />
        </div>
        <Field defaultValue={o?.url} error={errors.url} label="Link to posting" name="url" optional placeholder="https://" type="url" />
        <details className="disclosure" open={Boolean(o) || undefined}>
          <summary>More details</summary>
          <div className="form-grid" style={{ marginTop: 'var(--s-3)' }}>
            <div className="form-row">
              <Field defaultValue={o?.location} label="Location" name="location" placeholder="Istanbul" />
              <Field defaultValue={o?.workMode ?? 'hybrid'} label="Work mode" name="workMode" options={WORK_MODES} type="select" />
            </div>
            <div className="form-row">
              <Field defaultValue={o?.source} label="Where you found it" name="source" placeholder="LinkedIn, referral…" />
              <Field defaultValue={o?.priority ?? 'medium'} label="Priority" name="priority" options={[['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} type="select" />
            </div>
          </div>
        </details>
      </div>
    </Dialog>
  )
}

export function CloseOpportunity({ opportunity: o, close, onClosed }: { opportunity: Opportunity; close: () => void; onClosed: (outcome: OpportunityStage) => void }) {
  const actions = useActions()
  const outcomes: [OpportunityStage, string, string][] = [
    ['rejected', 'Rejected', 'They said no, or the process ended on their side.'],
    ['withdrawn', 'Withdrawn', 'You decided not to continue.'],
    ['expired', 'Expired', 'No response, or the deadline passed.'],
    ...(rank(o.stage) >= rank('offer') ? [['accepted', 'Accepted offer', ''], ['declined', 'Declined offer', '']] as [OpportunityStage, string, string][] : []),
  ]

  async function submit(form: HTMLFormElement) {
    const outcome = new FormData(form).get('outcome') as OpportunityStage
    if (await actions.opportunities.close(o, outcome, formText(form, 'note'))) {
      closeDialog(form)
      onClosed(outcome)
    }
  }

  return (
    <Dialog className="dialog-sm" desc="Closed opportunities leave your active pipeline and stop follow-up reminders. History stays for analytics." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Close opportunity</SubmitButton></>} onClose={close} onSubmit={submit} title={`Close ${orgOf(o)}`}>
      <fieldset className="radio-list">
        <legend className="visually-hidden">Outcome</legend>
        {outcomes.map(([value, label, hint], index) => (
          <label className="radio-card" key={value}><input defaultChecked={index === 0} name="outcome" type="radio" value={value} /><span><strong>{label}</strong>{hint && <span className="xs muted">{hint}</span>}</span></label>
        ))}
      </fieldset>
      <Field label="Note" name="note" optional placeholder="Feedback or reason, for your future self" />
    </Dialog>
  )
}

export function LogActivity({ opportunity: o, close }: { opportunity: Opportunity; close: () => void }) {
  const actions = useActions()
  const [error, setError] = useState('')
  const types: OpportunityActivityType[] = ['email_received', 'follow_up_sent', 'call', 'interview', 'interview_scheduled', 'assessment_received', 'note_added']

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const type = fd.get('type') as OpportunityActivityType
    const date = String(fd.get('date') || '')
    const message = !date ? 'Pick a date.' : date > D.today() ? 'Activity can’t be in the future. Use an event or task for that.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    const text = formText(form, 'text') || ACTIVITY_TYPES[type][1]
    if (await actions.opportunities.logActivity(o, type, text, date)) closeDialog(form)
  }

  return (
    <Dialog desc={`${orgOf(o)}: ${o.title}. Logging anything resets the follow-up clock.`} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Log activity</SubmitButton></>} onClose={close} onSubmit={submit} title="Log activity">
      <div className="form-grid">
        <div className="form-row">
          <Field label="What happened" name="type" options={types.map((type): [string, string] => [type, type === 'follow_up_sent' ? 'I sent a follow-up' : ACTIVITY_TYPES[type][1]])} type="select" />
          <Field defaultValue={D.today()} error={error} label="Date" name="date" type="date" />
        </div>
        <Field label="Details" name="text" placeholder="e.g. Recruiter asked for availability next week" rows={2} type="textarea" />
      </div>
    </Dialog>
  )
}

const CONTACT_KINDS: ContactKind[] = ['recruiter', 'hiring manager', 'referral', 'mentor', 'colleague', 'interviewer', 'community', 'other']

export function ContactEditor({ close }: { close: () => void }) {
  const actions = useActions()
  const [errors, setErrors] = useState<Errors>({})

  async function submit(form: HTMLFormElement) {
    const name = formText(form, 'name')
    const email = formText(form, 'email')
    const next: Errors = {}
    if (!name) next.name = 'Add a name.'
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = 'That email address looks incomplete.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.career.addContact({ name, role: formText(form, 'role') || null, organization: formText(form, 'org') || null, kind: new FormData(form).get('kind') as ContactKind, email: email || null })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add person</SubmitButton></>} onClose={close} onSubmit={submit} title="Add person">
      <div className="form-grid">
        <Field error={errors.name} label="Name" name="name" required />
        <div className="form-row"><Field label="Role" name="role" placeholder="Technical Recruiter" /><Field label="Organization" name="org" /></div>
        <div className="form-row"><Field label="Relationship" name="kind" options={CONTACT_KINDS} type="select" /><Field error={errors.email} label="Email" name="email" optional type="email" /></div>
      </div>
    </Dialog>
  )
}

export function ContactDrawer({ contact, close }: { contact: Contact; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const current = data.contacts.find((c) => c.id === contact.id) ?? contact
  const history = data.interactions.filter((i) => i.contactId === contact.id).sort((a, b) => b.date.localeCompare(a.date))
  const linked = data.opportunities.filter((o) => o.contactIds.includes(contact.id))

  async function submit(form: HTMLFormElement) {
    const summary = formText(form, 'isummary')
    setError(summary ? '' : 'Write one line about what happened.')
    if (!summary) return focusFirstInvalid(form)
    const fd = new FormData(form)
    const saved = await actions.career.logInteraction(current, { type: fd.get('itype') as Interaction['type'], date: String(fd.get('idate') || D.today()), summary })
    if (saved) (form.querySelector('[name="isummary"]') as HTMLInputElement).value = ''
  }

  return (
    <Dialog className="drawer" desc={[current.role, current.organization].filter(Boolean).join(', ')} foot={false} initialFocus="[data-close]" onClose={close} onSubmit={submit} title={current.name}>
      <div className="stack">
        <dl className="facts">
          {current.email && <div><dt>Email</dt><dd className="copy-row"><input aria-label="Email" className="input input-plain" readOnly value={current.email} /><button className="btn btn-sm" onClick={() => { void navigator.clipboard?.writeText(current.email!); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }} type="button">{copied ? 'Copied' : 'Copy'}</button></dd></div>}
          {current.linkedin && <div><dt>LinkedIn</dt><dd><a href={`https://${current.linkedin.replace(/^https?:\/\//, '')}`} rel="noopener noreferrer" target="_blank">{current.linkedin}</a></dd></div>}
          {linked.length > 0 && <div><dt>Linked to</dt><dd>{linked.map((o, index) => <span key={o.id}>{index > 0 && <br />}<a data-close href={`#/career/${o.id}`}>{orgOf(o)}: {o.title}</a></span>)}</dd></div>}
        </dl>
        {current.notes && <p className="small" style={{ lineHeight: 'var(--lh-read)' }}>{current.notes}</p>}
        <section className="section">
          <div className="section-head"><h3>Log an interaction</h3></div>
          <div className="form-grid">
            <div className="form-row">
              <Field id="i-type" label="Type" name="itype" options={[['email', 'Email'], ['message', 'Message'], ['call', 'Call'], ['meeting', 'Meeting'], ['interview', 'Interview'], ['referral', 'Referral']]} type="select" />
              <Field defaultValue={D.today()} id="i-date" label="Date" name="idate" type="date" />
            </div>
            <Field error={error} id="i-summary" label="What happened" name="isummary" placeholder="e.g. Asked about the team’s on-call rotation" />
            <div><SubmitButton className="btn">Log interaction</SubmitButton></div>
          </div>
        </section>
        <section className="section">
          <div className="section-head"><h3>History</h3></div>
          {history.length
            ? <ol className="timeline">{history.map((i) => <li className="tl-item" key={i.id}><span aria-hidden="true" className="tl-dot tl-icon"><Icon className="icon-sm" name={interactionIcon(i.type)} /></span><div className="tl-body"><span className="tl-title">{i.summary}</span><span className="xs muted">{D.withDay(i.date)}, {i.type}</span></div></li>)}</ol>
            : <p className="small muted">No interactions logged yet.</p>}
        </section>
      </div>
    </Dialog>
  )
}

const RESUME_ACCEPT = ['.pdf', '.docx']

/** Add a resume version, or edit one: its name, focus and the document itself. */
export function ResumeEditor({ resume, close }: { resume?: Resume | null; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [removeCurrent, setRemoveCurrent] = useState(false)
  const current = resume?.file && !removeCurrent ? resume.file : null

  async function submit(form: HTMLFormElement) {
    const name = formText(form, 'name')
    const focus = formText(form, 'focus')
    setError(name ? '' : 'Name this version.')
    if (!name) return focusFirstInvalid(form)
    if (!resume) {
      // Without a file the "Resume added" toast is the only one; with a file, the upload's toast is.
      const created = await actions.career.addResume({ name, focus }, Boolean(file))
      if (!created) return
      closeDialog(form)
      if (file) await actions.career.attachResumeFile(created, file)
      return
    }
    const changed = name !== resume.name || (focus || null) !== resume.focus
    const fileChange = Boolean(file) || (removeCurrent && resume.file)
    if (changed && !(await actions.career.updateResume(resume, { name, focus: focus || null }, Boolean(fileChange)))) return
    if (file && !(await actions.career.attachResumeFile(resume, file))) return
    if (!file && removeCurrent && resume.file && !(await actions.career.removeResumeFile(resume))) return
    closeDialog(form)
  }

  const nextVersion = Math.max(0, ...data.resumes.map((r) => r.version)) + 1
  return (
    <Dialog
      desc={resume ? undefined : `This will be v${nextVersion}. Record which version each application used to see what gets replies.`}
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{resume ? 'Save changes' : 'Add version'}</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title={resume ? `Edit v${resume.version}` : 'Add resume version'}
    >
      <div className="form-grid">
        <Field defaultValue={resume?.name} error={error} label="Name" name="name" placeholder="e.g. Backend and platform" required />
        <Field defaultValue={resume?.focus} label="Focus" name="focus" optional placeholder="What this version emphasises" />
        <FilePicker
          accept={RESUME_ACCEPT}
          current={current && { name: current.name, meta: `${RESUME_FILE_LABEL[current.type] ?? 'File'}, ${sizeLabel(current.size)}. Uploaded ${D.short(D.ymdOf(current.uploadedAt))}.` }}
          error={fileError}
          hint="PDF or Word, up to 10 MB. Stored on your Hop server, never sent elsewhere."
          label="File"
          maxBytes={RESUME_MAX_BYTES}
          onChange={(next, problem) => { setFile(next); setFileError(problem ?? '') }}
          onRemoveCurrent={() => setRemoveCurrent(true)}
          optional
          value={file}
        />
        {resume?.file && removeCurrent && !file && <p className="small muted">The file will be removed when you save. <button className="link-btn" onClick={() => setRemoveCurrent(false)} type="button">Keep it</button></p>}
      </div>
    </Dialog>
  )
}
