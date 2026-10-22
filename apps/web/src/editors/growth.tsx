// Growth dialogs: skills, projects, evidence and milestones.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ATTESTED_KINDS, EVIDENCE_KINDS } from '@hop/domain'
import * as D from '../lib/dates.ts'
import { EVIDENCE_KIND, SKILL_FOCUS, SKILL_LAYERS, SKILL_LEVEL_LABEL, SKILL_TYPE } from '../lib/labels.ts'
import { PROOF_LABEL, PROOF_LEVELS, evidenceNote, planTitle, proofLevel, whyLine } from '../lib/skills.ts'
import type { ProofLevel } from '../lib/skills.ts'
import type { Evidence, EvidenceKind, Project, ProjectStatus, Skill, SkillFocus, SkillType } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Badge, Dialog, Field, Segmented, SubmitButton } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText, useDialogs } from '../components/ui-context.ts'
import { TaskEditor } from './planning.tsx'

const TYPE_OPTIONS = Object.entries(SKILL_TYPE).map(([value, [label]]): [string, string] => [value, label])
const FOCUS_OPTIONS = Object.entries(SKILL_FOCUS).map(([value, [label]]): [string, string] => [value, label])

/** Three bars for the four steps: none lit is Claimed, all lit is Top-tier. */
export function ProofMeter({ level }: { level: ProofLevel }) {
  const index = PROOF_LEVELS.indexOf(level)
  return <span className="level"><span aria-hidden="true" className="level-bars">{PROOF_LEVELS.slice(1).map((value, k) => <i className={k < index ? 'on' : ''} key={value} />)}</span><span className="small">{PROOF_LABEL[level]}</span></span>
}

const KIND_TONE: Record<EvidenceKind, string> = { built: '', test: 'primary', review: 'primary', used: 'primary', top: 'success', learned: '' }

export function KindBadge({ kind }: { kind: EvidenceKind | null }) {
  return kind ? <Badge tone={KIND_TONE[kind]}>{EVIDENCE_KIND[kind].label}</Badge> : <Badge tone="warning">No kind</Badge>
}

export function SkillEditor({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const layers = [...new Set([...SKILL_LAYERS, ...data.skills.map((k) => k.category ?? '').filter(Boolean)])]

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const name = formText(form, 'name')
    const message = !name ? 'Name the skill.' : data.skills.some((k) => k.name.toLowerCase() === name.toLowerCase()) ? 'You already track this skill.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    const saved = await actions.growth.addSkill({ name, category: formText(form, 'category') || null, type: fd.get('type') as SkillType, focus: fd.get('focus') as SkillFocus })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog desc="Its level comes from the evidence you add, not from a rating." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add skill</SubmitButton></>} onClose={close} onSubmit={submit} title="New skill">
      <div className="form-grid">
        <Field error={error} label="Skill" name="name" placeholder="e.g. PostgreSQL" required />
        <Field label="Layer" name="category" optional placeholder="e.g. Software engineering" suggestions={layers} />
        <Segmented defaultValue="tool" hint={`Tool: ${SKILL_TYPE.tool[1].toLowerCase()} Fundamental: ${SKILL_TYPE.fundamental[1].toLowerCase()}`} label="Type" name="type" options={TYPE_OPTIONS} />
        <Segmented defaultValue="keep" hint="Core is your current path; standout aims for Top-tier; parked is left out of warnings." label="Focus" name="focus" options={FOCUS_OPTIONS} />
      </div>
    </Dialog>
  )
}

export function SkillDrawer({ skill, close }: { skill: Skill; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const { open } = useDialogs()
  const today = D.today()
  const current = data.skills.find((k) => k.id === skill.id) ?? skill
  const [confidence, setConfidence] = useState(current.confidence ?? 5)
  const proof = proofLevel(current, data.evidence, today)
  const plan = planTitle(current, proof)
  const evidence = data.evidence.filter((e) => e.skillIds.includes(skill.id)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const projects = data.projects.filter((p) => p.skillIds.includes(skill.id))
  const save = (changes: Partial<Skill>, label: string) => void actions.growth.updateSkill(current, changes, label)
  // Another dialog takes the drawer's place.
  const switchTo = (form: HTMLFormElement, render: (closeNext: () => void) => ReactNode) => {
    closeDialog(form)
    open(render)
  }

  return (
    <Dialog className="drawer" desc={current.category ?? undefined} foot={false} onClose={close} title={current.name}>
      <div className="stack">
        <section aria-label="Proof level" className="proof-summary">
          <ProofMeter level={proof.level} />
          <p className="small">{whyLine(proof)}</p>
          {proof.next && (
            <div className="proof-next">
              <p className="small"><strong>Next:</strong> {proof.next}</p>
              {plan && <button className="btn btn-sm" onClick={(event) => switchTo(event.currentTarget.form!, (closeNext) => <TaskEditor close={closeNext} defaults={{ title: plan }} />)} type="button"><Icon className="icon-sm" name="plus" />Plan it</button>}
            </div>
          )}
        </section>
        <Segmented hint={SKILL_TYPE[current.type][1]} label="Type" name="type" onChange={(type) => save({ type: type as SkillType }, `Type set to ${SKILL_TYPE[type as SkillType][0].toLowerCase()}`)} options={TYPE_OPTIONS} value={current.type} />
        <Segmented hint={SKILL_FOCUS[current.focus][1]} label="Focus" name="focus" onChange={(focus) => save({ focus: focus as SkillFocus }, `Focus set to ${SKILL_FOCUS[focus as SkillFocus][0].toLowerCase()}`)} options={FOCUS_OPTIONS} value={current.focus} />
        <label className="switch">
          <span><strong>Listed publicly</strong><span className="xs muted" style={{ display: 'block' }}>On your portfolio, LinkedIn or CV.</span></span>
          <input checked={current.listed} onChange={(event) => save({ listed: event.target.checked }, event.target.checked ? 'Listed publicly' : 'No longer listed publicly')} role="switch" type="checkbox" />
        </label>
        {/* After the buttons, so opening the drawer doesn't focus a text box (and raise a phone's keyboard). */}
        <div className="field">
          <label htmlFor="skill-bar">What Verified means for you</label>
          <textarea
            className="textarea"
            defaultValue={current.bar ?? ''}
            id="skill-bar"
            key={current.bar ?? ''}
            onBlur={(event) => {
              const bar = event.currentTarget.value.trim() || null
              if (bar !== current.bar) save({ bar }, 'Bar saved')
            }}
            placeholder="e.g. A reviewed project in production and a graded course, above what postings ask."
            rows={2}
          />
        </div>
        <div className="field">
          <label htmlFor="conf">Confidence: <span className="num">{confidence}</span> of 10</label>
          <input className="range" id="conf" max={10} min={1} onChange={(event) => setConfidence(Number(event.target.value))} onPointerUp={() => void actions.growth.updateSkill(current, { confidence }, 'Confidence updated', true)} onKeyUp={() => void actions.growth.updateSkill(current, { confidence }, 'Confidence updated', true)} type="range" value={confidence} />
          <span className="field-hint">How ready you feel to use it at work. Your own rating; it never changes the level.</span>
        </div>
        {current.level && <p className="xs muted">Your rating before proof levels: {SKILL_LEVEL_LABEL[current.level]}</p>}
        <section className="section">
          <div className="section-head"><h3>Evidence <span className="count">{evidence.length}</span></h3><button className="btn btn-sm" onClick={(event) => switchTo(event.currentTarget.form!, (closeNext) => <EvidenceEditor close={closeNext} defaults={{ skillId: skill.id }} />)} type="button"><Icon className="icon-sm" name="plus" />Add</button></div>
          {evidence.length
            ? (
              <ol className="timeline">
                {evidence.map((e) => {
                  const note = evidenceNote(current, e, proof, today)
                  return (
                    <li className="tl-item" key={e.id}>
                      <span aria-hidden="true" className="tl-dot tl-icon"><Icon className="icon-sm" name="award" /></span>
                      <div className="tl-body">
                        <span className="tl-title">{e.title}</span>
                        <span className="ev-meta xs muted">
                          <KindBadge kind={e.kind} />
                          <span>{[e.date ? D.monthYear(e.date) : 'Undated', e.by, e.result].filter(Boolean).join(' · ')}</span>
                          <button className="link-btn" onClick={(event) => switchTo(event.currentTarget.form!, (closeNext) => <EvidenceEditor close={closeNext} evidence={e} />)} type="button">{e.kind ? 'Edit' : 'Set the kind'}</button>
                        </span>
                        {note && <span className={`xs ${note.warn ? 'is-warning' : 'muted'}`}>{note.text}</span>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )
            : <p className="small muted">No evidence yet. Something you built, a graded test, a review or real users all count.</p>}
        </section>
        {projects.length > 0 && <section className="section"><div className="section-head"><h3>Used in</h3></div><ul className="link-list">{projects.map((p) => <li key={p.id}><a data-close href={`#/growth/projects?project=${p.id}`}><Icon className="icon-sm" name="code" />{p.name}</a></li>)}</ul></section>}
      </div>
    </Dialog>
  )
}

export function ProjectEditor({ close }: { close: () => void }) {
  const actions = useActions()
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const name = formText(form, 'name')
    setError(name ? '' : 'Name the project.')
    if (!name) return focusFirstInvalid(form)
    const stack = formText(form, 'stack').split(',').map((item) => item.trim()).filter(Boolean)
    if (await actions.growth.addProject({ name, problem: formText(form, 'problem'), stack })) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add project</SubmitButton></>} onClose={close} onSubmit={submit} title="New project">
      <div className="form-grid">
        <Field error={error} label="Project" name="name" required />
        <Field label="Problem it solves" name="problem" rows={2} type="textarea" />
        <Field label="Stack" name="stack" optional placeholder="Comma separated, e.g. Python, FastAPI" />
      </div>
    </Dialog>
  )
}

const PROJECT_STATUSES: [ProjectStatus, string][] = [['planned', 'Planned'], ['building', 'Building'], ['deployed', 'Deployed'], ['paused', 'Paused'], ['archived', 'Archived']]

const linkHref = (value: string) => (/^https?:\/\//.test(value) ? value : `https://${value}`)

export function ProjectDrawer({ project, close }: { project: Project; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const { open } = useDialogs()
  const current = data.projects.find((p) => p.id === project.id) ?? project
  const evidence = data.evidence.filter((e) => e.projectId === project.id).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const skills = data.skills.filter((k) => current.skillIds.includes(k.id))

  return (
    <Dialog className="drawer" desc={current.blurb ?? undefined} foot={false} onClose={close} title={current.name}>
      <div className="stack">
        <Field defaultValue={current.status} id="p-status" label="Status" name="status" onChange={(status) => void actions.growth.setProjectStatus(current, status as ProjectStatus)} options={PROJECT_STATUSES} type="select" />
        <dl className="facts">
          <div><dt>Problem</dt><dd>{current.problem || <span className="muted">Not written yet</span>}</dd></div>
          {current.learned && <div><dt>What I learned</dt><dd>{current.learned}</dd></div>}
          {current.repositoryUrl && <div><dt>Repository</dt><dd><a href={linkHref(current.repositoryUrl)} rel="noopener noreferrer" target="_blank">{current.repositoryUrl.replace(/^https?:\/\//, '')}</a></dd></div>}
          {current.demoUrl && <div><dt>Live</dt><dd><a href={linkHref(current.demoUrl)} rel="noopener noreferrer" target="_blank">{current.demoUrl.replace(/^https?:\/\//, '')}</a></dd></div>}
          {current.startDate && <div><dt>Started</dt><dd>{D.short(current.startDate)}</dd></div>}
        </dl>
        {skills.length > 0 && <div className="tag-list">{skills.map((k) => <a className="tag" data-close href={`#/growth/skills?skill=${k.id}`} key={k.id}>{k.name}</a>)}</div>}
        <section className="section">
          <div className="section-head"><h3>Evidence <span className="count">{evidence.length}</span></h3><button className="btn btn-sm" onClick={(event) => { closeDialog(event.currentTarget.form!); open((closeNext) => <EvidenceEditor close={closeNext} defaults={{ projectId: project.id }} />) }} type="button"><Icon className="icon-sm" name="plus" />Add</button></div>
          {evidence.length
            ? <ul className="evidence-mini">{evidence.map((e) => <li key={e.id}><span>{e.title}</span><span className="xs muted">{e.date ? D.short(e.date) : ''}</span></li>)}</ul>
            : <p className="small muted">What did this project prove? Add it here so it’s ready for interviews.</p>}
        </section>
      </div>
    </Dialog>
  )
}

export type EvidenceDefaults = { skillId?: string; projectId?: string; goalId?: string } & Partial<Pick<Evidence, 'kind' | 'title' | 'by' | 'result' | 'date' | 'courseId'>>

const KIND_OPTIONS = EVIDENCE_KINDS.map((kind): [string, string] => [kind, EVIDENCE_KIND[kind].label])

const BY_PLACEHOLDER: Record<EvidenceKind, string> = {
  built: '',
  test: 'e.g. İTÜ BLG 527E, or the exam board',
  review: 'e.g. Senior engineer at Getir',
  used: 'e.g. Mawaheb, about 200 users',
  top: 'e.g. Kaggle, 3,000 teams',
  learned: 'e.g. Coursera, or the book’s author',
}

/** Adds evidence, or edits it when `evidence` is given. Test, Review, Used and Top need who and when. */
export function EvidenceEditor({ close, evidence, defaults = {} }: { close: () => void; evidence?: Evidence | null; defaults?: EvidenceDefaults }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Entries from before kinds existed have none until one is picked here.
  const [kind, setKind] = useState<EvidenceKind | ''>(evidence ? evidence.kind ?? '' : defaults.kind ?? 'built')
  const base = evidence ?? defaults
  const attested = kind !== '' && ATTESTED_KINDS.includes(kind)
  const skillIds = evidence?.skillIds ?? (defaults.skillId ? [defaults.skillId] : [])
  const course = base.courseId ? data.courses.find((c) => c.id === base.courseId) : undefined

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const by = formText(form, 'by')
    const date = formText(form, 'date')
    const url = formText(form, 'url')
    const next: Record<string, string> = {}
    if (!title) next.title = 'Describe what happened in one line.'
    if (!kind) next.kind = 'Pick what kind of evidence this is.'
    else if (attested && !by) next.by = `${EVIDENCE_KIND[kind].by} Without a name, it’s only your word.`
    if (attested && !date) next.date = 'Add the date. Proof of a tool counts for a limited time from it.'
    else if (date > D.today()) next.date = 'That day hasn’t happened yet.'
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) next.url = 'Use a full link starting with https://'
    setErrors(next)
    if (!kind || Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.growth.saveEvidence(evidence ?? null, {
      title,
      kind,
      by: kind === 'built' ? null : by || null,
      result: formText(form, 'result') || null,
      date: date || null,
      skillIds: fd.getAll('skills').map(String),
      projectId: String(fd.get('projectId') || '') || null,
      goalId: String(fd.get('goalId') || '') || null,
      courseId: base.courseId ?? null,
      url: url || null,
    })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog desc={evidence ? undefined : 'Something that proves progress or capability.'} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{evidence ? 'Save changes' : 'Add evidence'}</SubmitButton></>} onClose={close} onSubmit={submit} title={evidence ? 'Edit evidence' : 'Add evidence'}>
      <div className="form-grid">
        <Field defaultValue={base.title} error={errors.title} label="What happened" name="title" placeholder="e.g. Deployed the classifier with a public demo" required />
        <Segmented error={errors.kind} hint={kind ? EVIDENCE_KIND[kind].meaning : 'Entries from before kinds existed count as Built until you pick one.'} label="Kind" name="kind" onChange={(value) => setKind(value as EvidenceKind)} options={KIND_OPTIONS} value={kind} />
        {kind && kind !== 'built' && <Field defaultValue={base.by} error={errors.by} label={EVIDENCE_KIND[kind].by} name="by" optional={!attested} placeholder={BY_PLACEHOLDER[kind]} />}
        <div className="form-row">
          <Field defaultValue={evidence ? evidence.date : defaults.date ?? D.today()} error={errors.date} label="Date" name="date" optional={!attested} type="date" />
          <Field defaultValue={base.result} label="Result" name="result" optional placeholder="Grade, score or user count" />
        </div>
        {course && <p className="small muted"><Icon className="icon-sm" name="school" /> The grade from {course.code} {course.name}.</p>}
        {data.skills.length > 0 && (
          <fieldset className="field">
            <legend className="field-label">Skills it shows</legend>
            <div className="check-chips">{data.skills.map((k) => <label className="check-chip" key={k.id}><input defaultChecked={skillIds.includes(k.id)} name="skills" type="checkbox" value={k.id} /><span>{k.name}</span></label>)}</div>
          </fieldset>
        )}
        <div className="form-row">
          <Field defaultValue={base.projectId ?? ''} label="Project" name="projectId" options={[['', 'None'], ...data.projects.map((p): [string, string] => [p.id, p.name])]} type="select" />
          <Field defaultValue={base.goalId ?? ''} label="Goal" name="goalId" options={[['', 'None'], ...data.goals.filter((g) => g.status === 'active' || g.id === base.goalId).map((g): [string, string] => [g.id, g.name])]} type="select" />
        </div>
        <Field defaultValue={evidence?.url} error={errors.url} label="Link" name="url" optional placeholder="Repo, certificate or demo" />
      </div>
    </Dialog>
  )
}

/** Without a goal, a milestone records something already reached; with one, it is a target. */
export function MilestoneEditor({ close, goalId }: { close: () => void; goalId?: string }) {
  const actions = useActions()
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const title = formText(form, 'title')
    setError(title ? '' : 'Name the milestone.')
    if (!title) return focusFirstInvalid(form)
    if (await actions.milestones.add({ title, date: String(new FormData(form).get('date') || D.today()), goalId: goalId ?? null })) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add milestone</SubmitButton></>} onClose={close} onSubmit={submit} title="Add milestone">
      <div className="form-grid">
        <Field error={error} label="Milestone" name="title" placeholder={goalId ? 'e.g. ML fundamentals done' : 'e.g. First production deployment'} required />
        <Field defaultValue={goalId ? D.addDays(D.today(), 30) : D.today()} label={goalId ? 'Target date' : 'Date'} name="date" type="date" />
      </div>
    </Dialog>
  )
}
