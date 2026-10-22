// Growth: skills, projects, evidence, milestones, Reading and Radar. A skill is only as strong as the evidence behind it.
import { useEffect } from 'react'
import * as D from '../lib/dates.ts'
import { capitalize, orgOf, plural } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Route } from '../lib/router.ts'
import { PROOF_LEVELS, byLayer, expiringProof, honesty, proofLevel } from '../lib/skills.ts'
import type { Proof } from '../lib/skills.ts'
import type { Evidence, Skill } from '../lib/types.ts'
import { EVIDENCE_KIND, SKILL_FOCUS } from '../lib/labels.ts'
import { useEditors } from '../editors/editors.tsx'
import { KindBadge, ProofMeter } from '../editors/growth.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, Empty, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { Radar } from './Radar.tsx'
import { Reading } from './Reading.tsx'

export function Growth({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const tab = route.params[0] || 'skills'
  const add = {
    skills: [() => editors.skill(), 'New skill'],
    projects: [() => editors.project(), 'New project'],
    evidence: [() => editors.evidence(), 'Add evidence'],
    milestones: [() => editors.milestone(), 'Add milestone'],
    reading: [() => editors.book(), 'Add a book'],
    radar: [() => editors.find(), 'Save a find'],
  }[tab] ?? [() => editors.skill(), 'New skill']

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Growth</h1><p>{tab === 'radar' ? 'What’s happening in your field, and what you’ll do about it.' : tab === 'reading' ? 'Books for your field: what to read next, what you’re reading, and what’s due back.' : 'What you’re learning and building, and the proof behind it.'}</p></div>
        <div className="page-head-actions"><button className="btn btn-primary" onClick={add[0] as () => void} type="button"><Icon className="icon-sm" name="plus" />{add[1] as string}</button></div>
      </header>
      <Tabs active={tab} items={[['skills', 'Skills', '#/growth/skills', data.skills.length], ['projects', 'Projects', '#/growth/projects', data.projects.length], ['evidence', 'Evidence', '#/growth/evidence', data.evidence.length], ['milestones', 'Milestones', '#/growth/milestones'], ['reading', 'Reading', '#/growth/reading', data.books.filter((b) => b.status === 'reading').length], ['radar', 'Radar', '#/growth/radar', data.finds.filter((f) => f.status === 'inbox').length]]} label="Growth sections" />
      {tab === 'radar' ? <Radar key={route.query.status} status={route.query.status} /> : tab === 'reading' ? <Reading bookId={route.query.book} key={route.query.status} status={route.query.status} /> : tab === 'projects' ? <Projects projectId={route.query.project} /> : tab === 'evidence' ? <EvidenceList /> : tab === 'milestones' ? <Milestones /> : <Skills skillId={route.query.skill} />}
    </div>
  )
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

type SkillRow = { skill: Skill; proof: Proof }

/** "Proof for React expires in 40 days." */
function expiryTitle(items: { skill: Skill; days: number }[]) {
  if (items.length === 1) return `Proof for ${items[0]!.skill.name} expires in ${plural(items[0]!.days, 'day')}.`
  return `Proof expires soon for ${items.map(({ skill, days }) => `${skill.name} (${plural(days, 'day')})`).join(', ')}.`
}

function Skills({ skillId }: { skillId?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  useOpenFromLink(skillId, '#/growth/skills', (id) => {
    const skill = data.skills.find((k) => k.id === id)
    if (skill) editors.skillDrawer(skill)
  })
  if (!data.skills.length) return <Empty action={() => editors.skill()} actionLabel="New skill" body="Add the capabilities you’re building. Their level comes from the evidence you add." title="No skills yet" />
  const today = D.today()
  const rows = data.skills
    .map((skill): SkillRow => ({ skill, proof: proofLevel(skill, data.evidence, today) }))
    .sort((a, b) => PROOF_LEVELS.indexOf(b.proof.level) - PROOF_LEVELS.indexOf(a.proof.level) || a.skill.name.localeCompare(b.skill.name))
  const parked = rows.filter((r) => r.skill.focus === 'parked')
  const { listed, claimed } = honesty(data.skills, data.evidence, today)
  const expiring = expiringProof(data.skills, data.evidence, today)
  return (
    <>
      {claimed.length > 0 && <Banner icon="alert" title={`You list ${plural(listed.length, 'skill')} publicly; ${claimed.length} ${claimed.length === 1 ? 'is' : 'are'} only Claimed: ${claimed.map((k) => k.name).join(', ')}.`} tone="warning">Add proof, or take {claimed.length === 1 ? 'it' : 'them'} off your profile until there is some.</Banner>}
      {expiring.length > 0 && <Banner icon="clock" title={expiryTitle(expiring)} tone="info">Fresh proof of the same kind keeps the level.</Banner>}
      {rows.length > parked.length && <SkillTable rows={rows.filter((r) => r.skill.focus !== 'parked')} />}
      {parked.length > 0 && (
        <details className="done-list">
          <summary>Show parked <span className="count">{parked.length}</span></summary>
          <SkillTable rows={parked} />
        </details>
      )}
      <p className="small muted">Levels come from evidence. Confidence is your own rating.</p>
    </>
  )
}

/** Skills grouped by layer, strongest proof first. */
function SkillTable({ rows }: { rows: SkillRow[] }) {
  const editors = useEditors()
  return (
    <div className="table-wrap">
      <table className="table table-stack skills-table">
        <thead><tr><th>Skill</th><th>Proof level</th><th>Proof</th><th>Focus</th><th>Listed</th></tr></thead>
        {byLayer(rows).map(({ layer, items }) => (
          <tbody key={layer}>
            <tr className="group-row"><th colSpan={5} scope="rowgroup">{layer}</th></tr>
            {items.map(({ skill: k, proof }) => (
              <tr className="tr-link" key={k.id}>
                <td><button className="row-open" onClick={() => editors.skillDrawer(k)} type="button">{k.name}</button></td>
                <td data-label="Proof level:"><ProofMeter level={proof.level} /></td>
                <td data-label="Proof:">{proof.kinds.length ? proof.kinds.map((kind) => EVIDENCE_KIND[kind].label).join(' · ') : <span className="muted">None yet</span>}</td>
                <td data-label="Focus:">{SKILL_FOCUS[k.focus][0]}</td>
                <td data-label="Listed:">{k.listed ? <Badge icon="check" tone="primary">Listed</Badge> : <span className="muted">Private</span>}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
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
  if (!data.evidence.length) return <Empty action={() => editors.evidence()} actionLabel="Add evidence" body="Evidence is proof: something you built, a graded test, a review, real users. It builds your career history." title="No evidence yet" />
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
                <div className="row row-link" key={e.id}>
                  <span aria-hidden="true" className="ev-icon"><Icon name="award" /></span>
                  <div className="row-main">
                    <button className="row-open" onClick={() => editors.editEvidence(e)} type="button">{e.title}</button>
                    <div className="row-meta">
                      <KindBadge kind={e.kind} />
                      {e.date && <span>{D.short(e.date)}</span>}
                      {e.by && <span>{e.by}</span>}
                      {e.result && <span>{e.result}</span>}
                      {project && <span><Icon name="code" />{project.name}</span>}
                      {opportunity && <span><Icon name="career" />{orgOf(opportunity)}</span>}
                      {tags.map((k) => <span className="tag tag-sm" key={k.id}>{k.name}</span>)}
                    </div>
                  </div>
                  {e.url && <div className="row-actions"><a aria-label={`Open the link for ${e.title}`} className="icon-btn" href={e.url} rel="noopener noreferrer" target="_blank"><Icon name="external" /></a></div>}
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
