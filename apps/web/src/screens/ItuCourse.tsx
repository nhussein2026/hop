// A course page: deadlines and grades (type a score when it comes back), what you need on the
// rest to reach a target, final eligibility, the instructor playbook, materials and ideas.
import { useState } from 'react'
import * as D from '../lib/dates.ts'
import { isOpen, plural } from '../lib/rules.ts'
import { eligibility, isExam, isPending, satInClass, scheduleLabel, standing, whenWord } from '../lib/uni.ts'
import type { Standing } from '../lib/uni.ts'
import type { Assessment, Contact, Course, Resource } from '../lib/types.ts'
import { ASSESSMENT_LABEL, COURSE_STATUS, IDEA_STAGE_LABEL } from '../lib/labels.ts'
import { navigate } from '../lib/router.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, Empty, Menu } from '../components/ui.tsx'
import type { MenuItem } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { useToast } from '../components/ui-context.ts'
import { useHop } from '../store/store.ts'
import { useUniActions } from '../store/uni-actions.ts'
import { ResourceRow } from './ItuLibrary.tsx'

/** One graded item in a list of deadlines: tick hand-ins as submitted, plan prep for anything. */
export function DeadlineRow({ course: c, item: a }: { course: Course; item: Assessment }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [justDone, setJustDone] = useState(false)
  const today = D.today()
  const n = a.due ? D.diffDays(a.due, today) : null
  const prep = data.tasks.find((t) => t.assessmentId === a.id && isOpen(t))
  const late = n !== null && n < 0
  const style = late ? { color: 'var(--danger)', fontWeight: 700 } : n !== null && n <= 1 ? { color: 'var(--warning)', fontWeight: 700 } : undefined
  const when = late ? `Was due ${D.relative(a.due!, today).toLowerCase()}` : whenWord(a.due!, today).replace(/^on /, '').replace(/^./, (m) => m.toUpperCase())
  return (
    <div className="row assess-row">
      {satInClass(a)
        ? <span aria-hidden="true" className="type-tile"><Icon name="file" /></span>
        : <button aria-checked={justDone} aria-label={`Mark submitted: ${c.code} ${a.title}`} className={`check${justDone ? ' just-done' : ''}`} onClick={async () => { setJustDone(true); if (!await actions.grading.toggleSubmitted(c, a)) setJustDone(false) }} role="checkbox" type="button"><Icon name="check" /></button>}
      <div className="row-main">
        <span className="row-title"><a className="code" href={`#/itu/courses/${c.id}`}>{c.code}</a> {a.title}</span>
        <div className="row-meta">
          <span style={style}><Icon name="clock" />{when}{a.time ? (a.time === '23:59' ? ', 23:59' : ` at ${a.time}`) : ''}</span>
          <span>{ASSESSMENT_LABEL[a.type]}</span>
          <span className="weight num">{a.weight}%</span>
          {prep && <span><Icon name="check" />Prep planned</span>}
        </div>
      </div>
      {!prep && <div className="row-actions"><button className="btn btn-sm" onClick={() => void actions.grading.planPrep(c, a)} type="button">Plan prep</button></div>}
    </div>
  )
}

export function CourseDetail({ id }: { id: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const confirm = useConfirm()
  const c = data.courses.find((x) => x.id === id)
  if (!c) return <div className="page"><Empty body={<a href="#/itu/courses">Back to courses</a>} icon="alert" pad={false} title="This course isn’t here anymore" /></div>

  const instructor = data.contacts.find((p) => p.id === c.instructorId)
  const term = data.terms.find((t) => t.id === c.termId)
  const s = standing(c)
  const v = eligibility(c)
  const materials = data.resources.filter((r) => r.courseId === c.id)
  const ideas = data.ideas.filter((i) => i.courseIds.includes(c.id))
  const isTaking = c.status === 'taking'
  const later = c.status === 'planned' || c.status === 'interested'
  const [statusLabel, statusTone] = COURSE_STATUS[c.status]

  async function remove() {
    const body = `Its deadlines and grades are deleted.${materials.length ? ` Its ${plural(materials.length, 'library item')} stay in your library, unlinked.` : ''}`
    if (!await confirm({ title: `Remove ${c!.code}?`, body, confirmLabel: 'Remove course', tone: 'danger' })) return
    if (await actions.courses.remove(c!)) navigate('#/itu/courses')
  }

  const menu: MenuItem[] = [
    { label: 'Edit course', icon: 'edit', onSelect: () => editors.course(c) },
    ...(isTaking ? [{ label: 'Mark completed…', icon: 'award', onSelect: () => editors.completeCourse(c) }] : []),
    ...(later ? [{ label: 'I’m taking it this term', icon: 'play', onSelect: () => void actions.courses.take(c) }] : []),
    '-',
    { label: 'Remove course', icon: 'trash', onSelect: () => void remove(), danger: true },
  ]

  const groups: [string, Resource['kind'][]][] = [['Notes', ['note']], ['Slides and files', ['slides', 'file']], ['Past exams', ['past-exam']], ['Books and papers', ['book', 'paper']], ['Links, videos and code', ['link', 'video', 'repo']]]

  return (
    <div className="page">
      <header className="page-head detail-head">
        <div className="page-head-text">
          <div className="detail-kicker"><span className="code">{c.code}</span><Badge tone={statusTone}>{statusLabel}</Badge>{term && <span className="xs muted">{term.name}</span>}</div>
          <h1 tabIndex={-1}>{c.name}</h1>
          <p>{[instructor?.name, c.schedule.length ? scheduleLabel(c) : 'No schedule set'].filter(Boolean).join('. ')}</p>
        </div>
        <div className="page-head-actions">
          {c.ninovaUrl && <a className="btn" href={c.ninovaUrl} rel="noopener noreferrer" target="_blank"><Icon className="icon-sm" name="external" />Ninova</a>}
          {isTaking && <button className="btn btn-primary" onClick={() => editors.assessment(c)} type="button"><Icon className="icon-sm" name="plus" />Add deadline</button>}
          <Menu items={menu} label="Course actions" />
        </div>
      </header>

      {later && <Banner icon="bulb" title={c.status === 'planned' ? `Planned for ${term?.name ?? 'a later term'}.` : 'A course you’re curious about.'} tone="info">{c.why || 'Save anything useful here now; it will be waiting when the course starts.'} {plural(materials.length, 'resource')} saved so far.</Banner>}
      {isTaking && v?.atRisk && <Banner icon="alert" title={!v.gradeOk ? 'In-term average below the VF limit' : v.left !== null && v.left <= 0 ? 'No absences left' : 'One absence left before VF'} tone="warning">{c.vf!.rule}.</Banner>}
      {c.status === 'completed' && <Banner icon="award" title={`Completed with ${c.grade ?? '—'}.`} tone="success">Materials and notes stay here for future courses and your thesis.</Banner>}

      <div className="split">
        <div className="stack">
          {(isTaking || c.grading.length > 0) && <Grades course={c} standing={s} />}
          <section aria-labelledby="mat-h" className="section">
            <div className="section-head">
              <h2 id="mat-h">Materials and notes <span className="count">{materials.length}</span></h2>
              <div className="btn-row">
                <button className="btn btn-sm" onClick={() => editors.resource({ kind: 'note', courseId: c.id })} type="button"><Icon className="icon-sm" name="edit" />New note</button>
                <button className="btn btn-sm" onClick={() => editors.resource({ courseId: c.id })} type="button"><Icon className="icon-sm" name="plus" />Add</button>
              </div>
            </div>
            {materials.length
              ? groups.map(([label, kinds]) => {
                const list = materials.filter((r) => kinds.includes(r.kind))
                return list.length ? <div className="mat-group" key={label}><h3 className="group-label">{label}</h3><div className="rows">{list.map((r) => <ResourceRow hideCourse key={r.id} resource={r} />)}</div></div> : null
              })
              : <p className="small muted">Slides, past exams, notes and links for {c.code} will collect here.</p>}
          </section>
        </div>

        <aside className="stack">
          {isTaking && c.vf && <Eligibility course={c} />}
          {instructor
            ? <Playbook contact={instructor} />
            : <section className="panel panel-pad"><p className="small muted">No instructor set. <button className="link-btn" onClick={() => editors.course(c)} type="button">Add one</button></p></section>}
          <section aria-labelledby="ci-h" className="section">
            <div className="section-head"><h2 id="ci-h">Ideas from this course</h2><button className="link-btn small" onClick={() => editors.idea({ courseIds: [c.id] })} type="button">Add</button></div>
            {ideas.length
              ? <ul className="link-list">{ideas.map((i) => <li key={i.id}><button className="link-btn" onClick={() => editors.ideaDrawer(i)} type="button"><Icon className="icon-sm" name="bulb" /> {i.title}</button><Badge tone={i.stage === 'parked' ? '' : 'primary'}>{IDEA_STAGE_LABEL[i.stage]}</Badge></li>)}</ul>
              : <p className="small muted">A thesis or project idea this course sparked. Save it before you forget.</p>}
          </section>
          <section className="panel panel-pad">
            <dl className="facts">
              {c.crn && <div><dt>CRN</dt><dd className="num">{c.crn}</dd></div>}
              {(c.credits !== null || c.ects !== null) && <div><dt>Credits</dt><dd>{[c.credits !== null && `${c.credits} credits`, c.ects !== null && `${c.ects} ECTS`].filter(Boolean).join(', ')}</dd></div>}
              {c.schedule.length > 0 && <div><dt>Classes</dt><dd>{scheduleLabel(c)}</dd></div>}
              {c.why && <div><dt>Why</dt><dd>{c.why}</dd></div>}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}

function needText(c: Course, s: Standing) {
  if (s.need === null) return s.remainingWeight > 0 ? 'Set a target to see what you need.' : 'Everything is graded.'
  if (s.need <= 0) return `You’ve already secured ${c.target}, even with zeros on the rest.`
  if (s.need > 100) return `${c.target} is out of reach now: it would need ${s.need} on the remaining ${s.remainingWeight}%.`
  return <>You need an average of <b className="num">{s.need}</b> on the remaining {s.remainingWeight}%.</>
}

function Grades({ course: c, standing: s }: { course: Course; standing: Standing }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const toast = useToast()
  const today = D.today()

  function saveScore(a: Assessment, input: HTMLInputElement) {
    const raw = input.value.trim()
    const score = raw === '' ? null : Number(raw)
    if (score === a.score) return
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) {
      input.setAttribute('aria-invalid', 'true')
      toast('Scores are out of 100. Use a number from 0 to 100.', { type: 'error' })
      return
    }
    input.removeAttribute('aria-invalid')
    void actions.grading.setScore(c, a, score)
  }

  function saveTarget(input: HTMLInputElement) {
    const target = input.value.trim() === '' ? null : Number(input.value)
    if (target === c.target) return
    if (target !== null && (!Number.isInteger(target) || target < 1 || target > 100)) {
      toast('Use a target from 1 to 100.', { type: 'error' })
      input.value = c.target ? String(c.target) : ''
      return
    }
    void actions.courses.update(c, { target }, 'Target updated', { quiet: true })
  }

  return (
    <section aria-labelledby="gr-h" className="section">
      <div className="section-head"><h2 id="gr-h">Deadlines and grades</h2><span className="section-meta">Type a score when it comes back</span></div>
      {c.grading.length
        ? (
          <div className="table-wrap">
            <table className="table table-stack grade-table">
              <thead><tr><th>Item</th><th className="num">Weight</th><th>Due</th><th className="num">Score</th><th className="num hide-phone">Points</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {c.grading.map((a) => {
                  const points = a.score !== null ? Math.round(a.weight * a.score) / 100 : null
                  const hasPrep = data.tasks.some((t) => t.assessmentId === a.id && isOpen(t))
                  const status = a.score !== null ? null : a.submitted ? <Badge icon="check" tone="success">Submitted</Badge> : a.due && a.due < today && !isExam(a) ? <Badge icon="alert" tone="warning">Not submitted</Badge> : null
                  return (
                    <tr key={a.id}>
                      <td><span className="cell-title">{a.title}</span> {status}<span className="xs muted cell-sub">{ASSESSMENT_LABEL[a.type]}</span></td>
                      <td className="num" data-label="Weight:">{a.weight}%</td>
                      <td data-label="Due:">{a.due ? `${D.withDay(a.due)}${a.time && a.time !== '23:59' ? ` ${a.time}` : ''}` : <span className="muted">Not set</span>}</td>
                      <td className="num" data-label="Score:">
                        <label className="visually-hidden" htmlFor={`sc-${a.id}`}>Score for {a.title}, out of 100</label>
                        <input
                          className="input score-input"
                          defaultValue={a.score ?? ''}
                          id={`sc-${a.id}`}
                          inputMode="decimal"
                          key={`${a.id}-${a.score}`}
                          max={100}
                          min={0}
                          onBlur={(event) => saveScore(a, event.currentTarget)}
                          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}
                          placeholder="—"
                          step={0.5}
                          type="number"
                        />
                      </td>
                      <td className="num hide-phone" data-label="Points:">{points !== null ? points.toFixed(1) : <span className="faint">—</span>}</td>
                      <td className="cell-actions">
                        <Menu items={[
                          ...(!satInClass(a) && a.score === null ? [{ label: a.submitted ? 'Mark not submitted' : 'Mark submitted', icon: 'check', onSelect: () => void actions.grading.toggleSubmitted(c, a) }] : []),
                          ...(a.due && isPending(a) && !hasPrep ? [{ label: 'Plan prep task', icon: 'calendar', onSelect: () => void actions.grading.planPrep(c, a) }] : []),
                          { label: 'Edit', icon: 'edit', onSelect: () => editors.assessment(c, a) },
                          '-',
                          { label: 'Delete', icon: 'trash', onSelect: () => void actions.grading.remove(c, a), danger: true },
                        ]} label={`Actions for ${a.title}`} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
        : <p className="small muted">Add the graded items from the syllabus: homework, quizzes, exams, projects and their weights.</p>}
      {c.grading.length > 0 && s.totalWeight !== 100 && <Banner icon="alert" tone="warning">Weights add up to {s.totalWeight}%, not 100%. Check the syllabus so the numbers below are right.</Banner>}
      {c.grading.length > 0 && (
        <div className="panel panel-pad standing">
          <div className="progress-figure">
            <span className="big-num num">{s.average ?? '—'}</span>
            <div>
              <p><strong>Average so far</strong> <span className="muted small">on {s.gradedWeight}% of the grade ({s.points} points)</span></p>
              <p className="small">
                <label htmlFor={`target-${c.id}`}>To finish at</label>
                <input className="input target-input" defaultValue={c.target ?? ''} id={`target-${c.id}`} key={c.target} max={100} min={1} onBlur={(event) => saveTarget(event.currentTarget)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} type="number" />
                <span>{needText(c, s)}</span>
              </p>
            </div>
          </div>
          <p className="xs muted">Weighted average only. Letter grades may be curved, so Hop doesn’t predict them.</p>
        </div>
      )}
    </section>
  )
}

function Eligibility({ course: c }: { course: Course }) {
  const actions = useUniActions()
  const v = eligibility(c)!
  const max = c.vf!.maxAbsences
  return (
    <section aria-labelledby="vf-h" className={`panel panel-pad vf-panel${v.atRisk ? ' is-risk' : ''}`}>
      <h2 id="vf-h">Final eligibility (VF)</h2>
      <p className="small muted">{c.vf!.rule}</p>
      <div className="vf-line">
        <Icon name={v.gradeOk ? 'check' : 'alert'} />
        <span className="small">{v.average === null ? 'No in-term scores yet.' : <>In-term average <b className="num">{v.average}</b>{c.vf!.minInTerm !== null ? `, minimum ${c.vf!.minInTerm}` : ''}.</>}</span>
      </div>
      {max !== null && (
        <div className="vf-line">
          <Icon name={v.left !== null && v.left > 1 ? 'check' : 'alert'} />
          <span className="small">Absences <b className="num">{c.absences}</b> of {max}{v.left !== null && v.left <= 1 && <>. <strong>{v.left <= 0 ? 'None left.' : 'One left.'}</strong></>}</span>
          <span className="stepper-btns">
            <button aria-label="Remove an absence" className="icon-btn" disabled={!c.absences} onClick={() => void actions.courses.setAbsences(c, Math.max(0, c.absences - 1))} type="button"><Icon name="minus" /></button>
            <button aria-label="Add an absence" className="icon-btn" onClick={() => void actions.courses.setAbsences(c, c.absences + 1)} type="button"><Icon name="plus" /></button>
          </span>
        </div>
      )}
    </section>
  )
}

function Playbook({ contact }: { contact: Contact }) {
  const editors = useEditors()
  const p = contact.playbook
  const facts: [string, string | undefined][] = [['Exams', p?.exams], ['What they value', p?.values], ['Office hours', p?.office], ['Emailing', p?.email]]
  const filled = facts.filter(([, value]) => value)
  return (
    <section aria-labelledby="pb-h" className="panel panel-pad playbook">
      <div className="section-head"><h2 id="pb-h">Working with {contact.name}</h2><button className="link-btn small" onClick={() => editors.playbook(contact)} type="button">Edit</button></div>
      {filled.length > 0
        ? <dl className="facts facts-stack">{filled.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        : <p className="small muted">How they run exams, what they value, office hours, how to email them. Add what you learn and what seniors tell you.</p>}
      {p && p.tips.length > 0 && <div><h3 className="small">Tips from seniors and experience</h3><ul className="dot-list small">{p.tips.map((tip, index) => <li key={index}>{tip}</li>)}</ul></div>}
      {contact.interests.length > 0 && <div aria-label="Research interests" className="tag-list">{contact.interests.map((topic) => <span className="tag" key={topic}>{topic}</span>)}</div>}
    </section>
  )
}
