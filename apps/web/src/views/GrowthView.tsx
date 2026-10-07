import { useState } from 'react'
import type { FormEvent } from 'react'
import { toLocalDate } from '../lib/date.js'
import type { Evidence, Project, ProjectStatus, Skill, SkillLevel } from '../types/index.js'

type GrowthViewProps = {
  skills: Skill[]
  projects: Project[]
  evidence: Evidence[]
  addSkill: (body: unknown) => Promise<unknown>
  updateSkill: (id: string, body: Partial<Skill>) => Promise<unknown>
  addProject: (body: unknown) => Promise<unknown>
  updateProject: (id: string, body: Partial<Project>) => Promise<unknown>
  addEvidence: (body: unknown) => Promise<unknown>
  error: string
}

export function GrowthView({ skills, projects, evidence, addSkill, updateSkill, addProject, updateProject, addEvidence, error }: GrowthViewProps) {
  const [skillName, setSkillName] = useState('')
  const [skillCategory, setSkillCategory] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectBlurb, setProjectBlurb] = useState('')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceDescription, setEvidenceDescription] = useState('')
  const [skillId, setSkillId] = useState('')
  const [projectId, setProjectId] = useState('')

  async function submitSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!skillName.trim()) return
    if (!await addSkill({ name: skillName.trim(), category: skillCategory.trim() || undefined })) return
    setSkillName(''); setSkillCategory('')
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectName.trim()) return
    if (!await addProject({ name: projectName.trim(), blurb: projectBlurb.trim() || undefined })) return
    setProjectName(''); setProjectBlurb('')
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!evidenceTitle.trim()) return
    if (!await addEvidence({ title: evidenceTitle.trim(), description: evidenceDescription.trim() || undefined, skillId: skillId || undefined, projectId: projectId || undefined, date: toLocalDate() })) return
    setEvidenceTitle(''); setEvidenceDescription(''); setSkillId(''); setProjectId('')
  }

  return (
    <section className="growth-page">
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="section-heading goals-header"><div><p className="eyebrow">Growth</p><h2>Skills & projects</h2></div><span className="count-badge">{skills.length + projects.length}</span></div>
      <p className="muted growth-intro">Keep your development concrete: what you are learning, practicing, and building confidence in.</p>
      <form className="goal-form" onSubmit={(event) => void submitSkill(event)}><input aria-label="Skill name" onChange={(event) => setSkillName(event.target.value)} placeholder="Add a skill..." value={skillName} /><input aria-label="Skill category" onChange={(event) => setSkillCategory(event.target.value)} placeholder="Category (optional)" value={skillCategory} /><button disabled={!skillName.trim()} type="submit">Add skill</button></form>
      <div className="goal-grid">{skills.length ? skills.map((skill) => <article className="goal-card skill-card" key={skill.id}><div className="goal-card-header"><div><p className="eyebrow">{skill.category || 'Uncategorized'}</p><h3>{skill.name}</h3></div><select aria-label={`Level for ${skill.name}`} className={`status-pill ${skill.level}`} onChange={(event) => void updateSkill(skill.id, { level: event.target.value as SkillLevel })} value={skill.level}><option value="learning">learning</option><option value="practicing">practicing</option><option value="confident">confident</option></select></div><div className="skill-confidence"><span>Confidence</span><strong>{skill.confidence ? `${skill.confidence}/10` : 'Not rated'}</strong></div><input aria-label={`Confidence for ${skill.name}`} max="10" min="1" onChange={(event) => void updateSkill(skill.id, { confidence: Number(event.target.value) })} type="range" value={skill.confidence ?? 5} /><div className="goal-meta"><span>{skill.lastPracticedAt ? `Practiced ${skill.lastPracticedAt}` : 'No practice logged yet'}</span><span>{skill.yearsExperience ? `${skill.yearsExperience} years` : 'New record'}</span></div></article>) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No skills recorded yet.</strong><span>Add a skill you are actively learning or practicing.</span></div>}</div>
      <div className="section-heading goals-header growth-subheading"><div><p className="eyebrow">Output</p><h2>Projects</h2></div><span className="count-badge">{projects.length}</span></div><p className="muted growth-intro">Capture finite work that turns learning into something you can show.</p>
      <form className="goal-form" onSubmit={(event) => void submitProject(event)}><input aria-label="Project name" onChange={(event) => setProjectName(event.target.value)} placeholder="Add a project..." value={projectName} /><input aria-label="Project summary" onChange={(event) => setProjectBlurb(event.target.value)} placeholder="What will it produce? (optional)" value={projectBlurb} /><button disabled={!projectName.trim()} type="submit">Add project</button></form>
      <div className="goal-grid">{projects.length ? projects.map((project) => <article className="goal-card project-card" key={project.id}><div className="goal-card-header"><div><p className="eyebrow">Finite outcome</p><h3>{project.name}</h3></div><select aria-label={`Status for ${project.name}`} className={`status-pill ${project.status}`} onChange={(event) => void updateProject(project.id, { status: event.target.value as ProjectStatus })} value={project.status}><option value="planned">planned</option><option value="building">building</option><option value="deployed">deployed</option><option value="paused">paused</option><option value="archived">archived</option></select></div><p className="goal-why">{project.blurb || 'Add an outcome summary to make this project concrete.'}</p><div className="goal-meta"><span>{project.stack.length ? project.stack.join(' · ') : 'Stack not recorded'}</span><span>{project.endDate || 'No end date'}</span></div></article>) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No projects recorded yet.</strong><span>Add something you are building or learning through.</span></div>}</div>
      <div className="section-heading goals-header growth-subheading"><div><p className="eyebrow">Proof of progress</p><h2>Evidence</h2></div><span className="count-badge">{evidence.length}</span></div><p className="muted growth-intro">Record concrete outcomes so your skills and projects become useful career history.</p>
      <form className="goal-form evidence-form" onSubmit={(event) => void submitEvidence(event)}><input aria-label="Evidence title" onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="What did you achieve?" value={evidenceTitle} /><input aria-label="Evidence description" onChange={(event) => setEvidenceDescription(event.target.value)} placeholder="Short description (optional)" value={evidenceDescription} /><select aria-label="Link evidence to a skill" onChange={(event) => setSkillId(event.target.value)} value={skillId}><option value="">No skill link</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><select aria-label="Link evidence to a project" onChange={(event) => setProjectId(event.target.value)} value={projectId}><option value="">No project link</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button disabled={!evidenceTitle.trim()} type="submit">Add evidence</button></form>
      <div className="goal-grid">{evidence.length ? evidence.map((item) => <article className="goal-card evidence-card" key={item.id}><div className="goal-card-header"><div><p className="eyebrow">{item.date || 'Undated proof'}</p><h3>{item.title}</h3></div><span className="status-pill deployed">recorded</span></div><p className="goal-why">{item.description || 'No description added yet.'}</p><div className="goal-meta"><span>{skills.find((skill) => skill.id === item.skillId)?.name || 'No skill link'}</span><span>{projects.find((project) => project.id === item.projectId)?.name || 'No project link'}</span></div></article>) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No evidence recorded yet.</strong><span>Capture a shipped feature, completed certification, or meaningful result.</span></div>}</div>
    </section>
  )
}