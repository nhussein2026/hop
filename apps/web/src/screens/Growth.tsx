// Growth: skills, projects, evidence, milestones. A skill is only as strong as the evidence behind it.
import { useEffect } from 'react'
import * as D from '../lib/dates.ts'
import { capitalize, orgOf, plural } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Route } from '../lib/router.ts'
import type { Evidence, SkillLevel } from '../lib/types.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, Empty, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { LEVELS, levelIndex } from '../lib/labels.ts'

export function Growth({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const tab = route.params[0] || 'skills'
  const add = {
    skills: [() => editors.skill(), 'New skill'],
    projects: [() => editors.project(), 'New project'],
    evidence: [() => editors.evidence(), 'Add evidence'],
    milestones: [() => editors.milestone(), 'Add milestone'],
  }[tab] ?? [() => editors.skill(), 'New skill']

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Growth</h1><p>What you’re learning and building, and the proof behind it.</p></div>
        <div className="page-head-actions"><button className="btn btn-primary" onClick={add[0] as () => void} type="button"><Icon className="icon-sm" name="plus" />{add[1] as string}</button></div>
      </header>
      <Tabs active={tab} items={[['skills', 'Skills', '#/growth/skills', data.skills.length], ['projects', 'Projects', '#/growth/projects', data.projects.length], ['evidence', 'Evidence', '#/growth/evidence', data.evidence.length], ['milestones', 'Milestones', '#/growth/milestones']]} label="Growth sections" />
      {tab === 'projects' ? <Projects projectId={route.query.project} /> : tab === 'evidence' ? <EvidenceList /> : tab === 'milestones' ? <Milestones /> : <Skills skillId={route.query.skill} />}
    </div>
  )
}

function LevelMeter({ level }: { level: SkillLevel }) {
  const index = levelIndex(level)
  return <span aria-label={`Level: ${LEVELS[index]![1]}`} className="level"><span aria-hidden="true" className="level-bars">{LEVELS.map(([value], k) => <i className={k <= index ? 'on' : ''} key={value} />)}</span><span className="small">{LEVELS[index]![1]}</span></span>
}

/** Open a drawer from a link such as #/growth/skills?skill=<id>, then drop the query. */
function useOpenFromLink(id: string | undefined, path: string, openItem: (id: string) => void) {
  useEffect(() => {
    if (!id) return
    navigate(path)
    openItem(id)
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
}

function Skills({ skillId }: { skillId?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  useOpenFromLink(skillId, '#/growth/skills', (id) => {
    const skill = data.skills.find((k) => k.id === id)
    if (skill) editors.skillDrawer(skill)
  })
  if (!data.skills.length) return <Empty action={() => editors.skill()} actionLabel="New skill" body="Add the capabilities you’re building. Link evidence so they’re more than labels." title="No skills yet" />
  const evidenceCount = (id: string) => data.evidence.filter((e) => e.skillIds.includes(id)).length
  const noEvidence = data.skills.filter((k) => !evidenceCount(k.id))
  return (
    <>
      {noEvidence.length > 0 && <Banner icon="info" title={`${plural(noEvidence.length, 'skill')} without evidence: ${noEvidence.map((k) => k.name).join(', ')}.`} tone="info">Link a project, certificate or result so it holds up in an interview.</Banner>}
      <div className="table-wrap">
        <table className="table table-stack skills-table">
          <thead><tr><th>Skill</th><th>Level</th><th className="num">Evidence</th><th>Last practised</th></tr></thead>
          <tbody>
            {[...data.skills].sort((a, b) => levelIndex(b.level) - levelIndex(a.level) || a.name.localeCompare(b.name)).map((k) => {
              const count = evidenceCount(k.id)
              return (
                <tr className="tr-link" key={k.id}>
                  <td><button className="row-open" onClick={() => editors.skillDrawer(k)} type="button">{k.name}</button>{k.category && <span className="xs muted skill-cat">{k.category}</span>}</td>
                  <td data-label="Level:"><LevelMeter level={k.level} /></td>
                  <td className="num" data-label="Evidence:">{count || <Badge icon="alert" tone="warning">None</Badge>}</td>
                  <td className="muted" data-label="Last practised:">{k.lastPracticedAt ? D.relative(k.lastPracticedAt) : 'Not recorded'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">Levels are self-assessed. Evidence is what makes them credible.</p>
    </>
  )
}

const PROJECT_TONE: Record<string, string> = { building: 'primary', deployed: 'success', planned: '', paused: '', archived: '' }

function Projects({ projectId }: { projectId?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  useOpenFromLink(projectId, '#/growth/projects', (id) => {
    const project = data.projects.find((p) => p.id === id)
    if (project) editors.projectDrawer(project)
  })
  if (!data.projects.length) return <Empty action={() => editors.project()} actionLabel="New project" body="Add something you’re building or learning through. Projects become career evidence." title="No projects yet" />
  return (
    <div className="project-grid">
      {data.projects.map((p) => {
        const evidence = data.evidence.filter((e) => e.projectId === p.id).length
        const goal = data.goals.find((g) => g.id === p.goalIds[0])
        return (
          <article className="panel project-card row-link" key={p.id}>
            <div className="project-head">
              <h2><button className="row-open" onClick={() => editors.projectDrawer(p)} type="button">{p.name}</button></h2>
              <Badge tone={PROJECT_TONE[p.status]}>{capitalize(p.status)}</Badge>
            </div>
            {p.blurb && <p className="small muted">{p.blurb}</p>}
            {p.stack.length > 0 && <div className="tag-list">{p.stack.map((item) => <span className="tag" key={item}>{item}</span>)}</div>}
            <div className="project-foot xs muted"><span>{plural(evidence, 'evidence entry', 'evidence entries')}</span>{goal && <span><Icon className="icon-sm" name="goals" />{goal.name}</span>}</div>
          </article>
        )
      })}
    </div>
  )
}

function EvidenceList() {
  const { data } = useHop()
  const editors = useEditors()
  if (!data.evidence.length) return <Empty action={() => editors.evidence()} actionLabel="Add evidence" body="Evidence is proof: a shipped feature, a passed interview, a certificate. It builds your career history." title="No evidence yet" />
  const sorted = [...data.evidence].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const groups: { month: string; items: Evidence[] }[] = []
  for (const e of sorted) {
    const month = e.date ? D.monthYear(e.date) : 'Undated'
    let group = groups.at(-1)
    if (!group || group.month !== month) groups.push((group = { month, items: [] }))
    group.items.push(e)
  }
  return (
    <>
      {groups.map((group) => (
        <section className="section" key={group.month}>
          <h2 className="group-label">{group.month}</h2>
          <div className="rows">
            {group.items.map((e) => {
              const project = data.projects.find((p) => p.id === e.projectId)
              const opportunity = data.opportunities.find((o) => o.id === e.opportunityId)
              const tags = data.skills.filter((k) => e.skillIds.includes(k.id))
              return (
                <div className="row" key={e.id}>
                  <span aria-hidden="true" className="ev-icon"><Icon name="award" /></span>
                  <div className="row-main">
                    <span className="row-title">{e.url ? <a href={e.url} rel="noopener noreferrer" target="_blank">{e.title}</a> : e.title}</span>
                    <div className="row-meta">
                      {e.date && <span>{D.short(e.date)}</span>}
                      {project && <span><Icon name="code" />{project.name}</span>}
                      {opportunity && <span><Icon name="career" />{orgOf(opportunity)}</span>}
                      {tags.map((k) => <span className="tag tag-sm" key={k.id}>{k.name}</span>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

function Milestones() {
  const { data } = useHop()
  const editors = useEditors()
  const reached = data.milestones.filter((m) => m.done)
  if (!reached.length) return <Empty action={() => editors.milestone()} actionLabel="Add milestone" body="Dated checkpoints worth remembering: a first deployment, a first interview." title="No milestones yet" />
  return (
    <ol className="timeline timeline-lg">
      {[...reached].sort((a, b) => b.date.localeCompare(a.date)).map((m) => {
        const goal = data.goals.find((g) => g.id === m.goalId)
        return <li className="tl-item is-done" key={m.id}><span aria-hidden="true" className="tl-dot"><Icon name="check" /></span><div className="tl-body"><span className="tl-title">{m.title}</span><span className="xs muted">{D.long(m.date)}{goal ? `, ${goal.name}` : ''}</span></div></li>
      })}
    </ol>
  )
}
