// Growth dialogs: skills, projects, evidence and milestones.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import type { Project, ProjectStatus, Skill, SkillLevel } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, Segmented, SubmitButton } from '../components/ui.tsx'
import { LEVELS, levelIndex } from '../lib/labels.ts'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText, useDialogs } from '../components/ui-context.ts'

export function SkillEditor({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')

  async function submit(form: HTMLFormElement) {
    const name = formText(form, 'name')
    const message = !name ? 'Name the skill.' : data.skills.some((k) => k.name.toLowerCase() === name.toLowerCase()) ? 'You already track this skill.' : ''
    setError(message)
    if (message) return focusFirstInvalid(form)
    const saved = await actions.growth.addSkill({ name, category: formText(form, 'category') || 'Other', level: new FormData(form).get('level') as SkillLevel })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add skill</SubmitButton></>} onClose={close} onSubmit={submit} title="New skill">
      <div className="form-grid">
        <Field error={error} label="Skill" name="name" placeholder="e.g. PostgreSQL" required />
        <div className="form-row">
          <Field label="Category" name="category" placeholder="e.g. Data" />
          <Field defaultValue="learning" label="Level" name="level" options={LEVELS} type="select" />
        </div>
      </div>
    </Dialog>
  )
}

export function SkillDrawer({ skill, close }: { skill: Skill; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const { open } = useDialogs()
  const current = data.skills.find((k) => k.id === skill.id) ?? skill
  const [confidence, setConfidence] = useState(current.confidence ?? 5)
  const evidence = data.evidence.filter((e) => e.skillIds.includes(skill.id)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const projects = data.projects.filter((p) => p.skillIds.includes(skill.id))

  return (
    <Dialog className="drawer" desc={current.category ?? undefined} foot={false} onClose={close} title={current.name}>
      <div className="stack">
        <Segmented label="Level" name="level" onChange={(level) => void actions.growth.updateSkill(current, { level: level as SkillLevel }, `Level set to ${LEVELS[levelIndex(level as SkillLevel)]![1]}`)} options={LEVELS} value={current.level} />
        <div className="field">
          <label htmlFor="conf">Confidence: <span className="num">{confidence}</span> of 10</label>
          <input className="range" id="conf" max={10} min={1} onChange={(event) => setConfidence(Number(event.target.value))} onPointerUp={() => void actions.growth.updateSkill(current, { confidence }, 'Confidence updated', true)} onKeyUp={() => void actions.growth.updateSkill(current, { confidence }, 'Confidence updated', true)} type="range" value={confidence} />
          <span className="field-hint">How ready you feel to use it at work. Not a measure of proficiency.</span>
        </div>
        <section className="section">
          <div className="section-head"><h3>Evidence <span className="count">{evidence.length}</span></h3><button className="btn btn-sm" onClick={(event) => { closeDialog(event.currentTarget.form!); open((closeNext) => <EvidenceEditor close={closeNext} skillId={skill.id} />) }} type="button"><Icon className="icon-sm" name="plus" />Add</button></div>
          {evidence.length
            ? <ol className="timeline">{evidence.map((e) => <li className="tl-item" key={e.id}><span aria-hidden="true" className="tl-dot tl-icon"><Icon className="icon-sm" name="award" /></span><div className="tl-body"><span className="tl-title">{e.title}</span><span className="xs muted">{e.date ? D.short(e.date) : 'Undated'}{e.projectId ? `, ${data.projects.find((p) => p.id === e.projectId)?.name ?? ''}` : ''}</span></div></li>)}</ol>
            : <p className="small muted">No evidence yet. A shipped feature, a passed assessment or a certificate all count.</p>}
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
          <div className="section-head"><h3>Evidence <span className="count">{evidence.length}</span></h3><button className="btn btn-sm" onClick={(event) => { closeDialog(event.currentTarget.form!); open((closeNext) => <EvidenceEditor close={closeNext} projectId={project.id} />) }} type="button"><Icon className="icon-sm" name="plus" />Add</button></div>
          {evidence.length
            ? <ul className="evidence-mini">{evidence.map((e) => <li key={e.id}><span>{e.title}</span><span className="xs muted">{e.date ? D.short(e.date) : ''}</span></li>)}</ul>
            : <p className="small muted">What did this project prove? Add it here so it’s ready for interviews.</p>}
        </section>
      </div>
    </Dialog>
  )
}

export function EvidenceEditor({ close, skillId, projectId, goalId }: { close: () => void; skillId?: string; projectId?: string; goalId?: string }) {
  const { data } = useHop()
  const actions = useActions()
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    const url = formText(form, 'url')
    const next: Record<string, string> = {}
    if (!title) next.title = 'Describe what happened in one line.'
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) next.url = 'Use a full link starting with https://'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.growth.addEvidence({
      title,
      date: String(fd.get('date') || D.today()),
      skillIds: fd.getAll('skills').map(String),
      projectId: String(fd.get('projectId') || '') || null,
      goalId: String(fd.get('goalId') || '') || null,
      url,
    })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog desc="Something that proves progress or capability." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add evidence</SubmitButton></>} onClose={close} onSubmit={submit} title="Add evidence">
      <div className="form-grid">
        <Field error={errors.title} label="What happened" name="title" placeholder="e.g. Deployed the classifier with a public demo" required />
        <div className="form-row">
          <Field defaultValue={D.today()} label="Date" name="date" type="date" />
          <Field defaultValue={projectId ?? ''} label="Project" name="projectId" options={[['', 'None'], ...data.projects.map((p): [string, string] => [p.id, p.name])]} type="select" />
        </div>
        {data.skills.length > 0 && (
          <fieldset className="field">
            <legend className="field-label">Skills it shows</legend>
            <div className="check-chips">{data.skills.map((k) => <label className="check-chip" key={k.id}><input defaultChecked={skillId === k.id} name="skills" type="checkbox" value={k.id} /><span>{k.name}</span></label>)}</div>
          </fieldset>
        )}
        <Field defaultValue={goalId ?? ''} label="Goal" name="goalId" options={[['', 'None'], ...data.goals.filter((g) => g.status === 'active').map((g): [string, string] => [g.id, g.name])]} type="select" />
        <Field error={errors.url} label="Link" name="url" optional placeholder="Repo, certificate or demo" />
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

