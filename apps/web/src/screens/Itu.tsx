// İTÜ: everything for university life in one place. This term · Courses (+ course page) ·
// Library · Research · Handbook. Graded items are deadlines with weights; tasks are what you do to
// prepare. Both exist, linked, and both reach Today.
import type { ReactNode } from 'react'
import * as D from '../lib/dates.ts'
import { plural } from '../lib/rules.ts'
import type { Route } from '../lib/router.ts'
import { currentTerm, classesOn, eligibility, isPending, scheduleLabel, standing, taking, termWeek, unsubmitted, upcoming, whenWord } from '../lib/uni.ts'
import type { Course, KeyDate } from '../lib/types.ts'
import { KEY_DATE_KINDS, PIN_KINDS } from '../lib/labels.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, DateChip, Empty, Menu, ProgressBar, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { useUniActions } from '../store/uni-actions.ts'
import { CourseDetail, DeadlineRow } from './ItuCourse.tsx'
import { Library, ResourceRow } from './ItuLibrary.tsx'
import { Research } from './ItuResearch.tsx'

export function Itu({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const sub = route.params[0] || 'term'
  if (sub === 'courses' && route.params[1]) return <CourseDetail id={route.params[1]} />

  const today = D.today()
  const term = currentTerm(data.terms, today)
  const program = data.settings.program
  const heading = [program.degree, program.department].filter(Boolean).join(' ')
  const actions: Record<string, ReactNode> = {
    term: <><button className="btn" onClick={() => editors.resource()} type="button"><Icon className="icon-sm" name="library" />Add to library</button><button className="btn btn-primary" onClick={() => editors.assessment()} type="button"><Icon className="icon-sm" name="plus" />Add deadline</button></>,
    courses: <button className="btn btn-primary" onClick={() => editors.course()} type="button"><Icon className="icon-sm" name="plus" />Add course</button>,
    library: <><button className="btn" onClick={() => editors.resource({ kind: 'note' })} type="button"><Icon className="icon-sm" name="edit" />New note</button><button className="btn btn-primary" onClick={() => editors.resource()} type="button"><Icon className="icon-sm" name="plus" />Add resource</button></>,
    research: <button className="btn btn-primary" onClick={() => editors.idea()} type="button"><Icon className="icon-sm" name="plus" />New idea</button>,
    handbook: <button className="btn btn-primary" onClick={() => editors.keyDate()} type="button"><Icon className="icon-sm" name="plus" />Add key date</button>,
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text">
          <h1 tabIndex={-1}>İTÜ</h1>
          <p>{heading || 'Courses, deadlines, materials and research'}{term ? `. ${term.name}, week ${termWeek(term, today, program.weeks)} of ${program.weeks}` : ''}.</p>
        </div>
        <div className="page-head-actions">{actions[sub]}</div>
      </header>
      <Tabs
        active={sub}
        items={[['term', 'This term', '#/itu'], ['courses', 'Courses', '#/itu/courses', data.courses.length], ['library', 'Library', '#/itu/library', data.resources.length], ['research', 'Research', '#/itu/research'], ['handbook', 'Handbook', '#/itu/handbook']]}
        label="İTÜ sections"
      />
      {sub === 'courses' ? <CourseList /> : sub === 'library' ? <Library query={route.query} /> : sub === 'research' ? <Research query={route.query} /> : sub === 'handbook' ? <Handbook /> : <ThisTerm />}
    </div>
  )
}

/* ---- This term -------------------------------------------------------------------------- */
function ThisTerm() {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const courses = taking(data.courses)
  const term = currentTerm(data.terms, today)

  if (!courses.length) {
    return (
      <>
        {!data.terms.length && <Banner action={<button className="btn btn-sm" onClick={() => editors.term()} type="button">Add term</button>} icon="calendar" title="Add the current term first." tone="info">Its dates tell Hop which week it is and when classes run.</Banner>}
        <Empty action={() => editors.course()} actionLabel="Add a course" body="Add the courses you’re taking. Each one gets its deadlines, grades, materials and instructor notes in one place." title="Set up this term" />
      </>
    )
  }

  const due = upcoming(data.courses, today, 21)
  const late = unsubmitted(data.courses, today)
  const weekStart = D.startOfWeek(today, data.settings.weekStart)
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => D.addDays(weekStart, i)).filter((ymd) => classesOn(data.courses, ymd).length)
  const keyDates = data.keyDates.filter((k) => k.date >= today && D.diffDays(k.date, today) <= 60).slice(0, 4)
  const recent = [...data.resources].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)

  return (
    <>
      {!term && <Banner action={<button className="btn btn-sm" onClick={() => editors.term()} type="button">Add term</button>} icon="calendar" title="No term is running today." tone="info">Add this term’s dates so classes show up on Today and the week number is right.</Banner>}
      <div className="split">
        <div className="stack">
          <section aria-labelledby="dl-h" className="section">
            <div className="section-head"><h2 id="dl-h">Next 3 weeks <span className="count">{due.length + late.length}</span></h2><span className="section-meta">Homework, projects, quizzes and exams</span></div>
            {due.length || late.length
              ? <div className="rows">{[...late, ...due].map(({ course, item }) => <DeadlineRow course={course} item={item} key={item.id} />)}</div>
              : <p className="small muted">Nothing due in the next three weeks.</p>}
          </section>
          <section aria-labelledby="cs-h" className="section">
            <div className="section-head"><h2 id="cs-h">Courses</h2><a className="small" href="#/itu/courses">All courses</a></div>
            <div className="course-grid">{courses.map((c) => <CourseCard course={c} key={c.id} />)}</div>
          </section>
        </div>
        <aside className="stack">
          <section aria-labelledby="wk-h" className="section">
            <div className="section-head"><h2 id="wk-h">This week’s classes</h2></div>
            {days.length
              ? (
                <ol className="mini-agenda">
                  {days.flatMap((ymd) => classesOn(data.courses, ymd).map(({ course, slot }) => (
                    <li className={`${ymd === today ? 'is-today' : ''}${ymd < today ? ' is-past' : ''}`} key={`${ymd}-${course.id}-${slot.start}`}>
                      <DateChip date={ymd} />
                      <span className="mini-main"><a className="mini-title" href={`#/itu/courses/${course.id}`}>{course.code} {course.name}</a><span className="xs muted">{slot.start}–{slot.end}{slot.room ? `, ${slot.room}` : ''}{ymd === today ? ' (today)' : ''}</span></span>
                    </li>
                  )))}
                </ol>
              )
              : <p className="small muted">No classes scheduled this week.</p>}
          </section>
          <section aria-labelledby="kd-h" className="section">
            <div className="section-head"><h2 id="kd-h">Key dates</h2><a className="small" href="#/itu/handbook">Handbook</a></div>
            {keyDates.length ? <ul className="key-dates">{keyDates.map((k) => <KeyDateItem item={k} key={k.id} />)}</ul> : <p className="small muted">No key dates in the next two months.</p>}
          </section>
          {recent.length > 0 && (
            <section aria-labelledby="rl-h" className="section">
              <div className="section-head"><h2 id="rl-h">Recently added</h2><a className="small" href="#/itu/library">Library</a></div>
              <div className="rows rows-compact">{recent.map((r) => <ResourceRow key={r.id} menu={false} resource={r} />)}</div>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

function CourseCard({ course: c }: { course: Course }) {
  const { data } = useHop()
  const today = D.today()
  const s = standing(c)
  const v = eligibility(c)
  const next = c.grading.filter((a) => a.due && isPending(a) && a.due >= today).sort((a, b) => a.due!.localeCompare(b.due!))[0]
  const instructor = data.contacts.find((p) => p.id === c.instructorId)
  return (
    <article className="course-card row-link">
      <div className="course-card-head"><span className="code">{c.code}</span>{v?.atRisk && <Badge icon="alert" tone="warning">{v.left !== null && v.left <= 0 ? 'No absences left' : v.left === 1 ? '1 absence left' : 'VF risk'}</Badge>}</div>
      <h3><a className="row-open" href={`#/itu/courses/${c.id}`}>{c.name}</a></h3>
      <p className="xs muted">{[instructor?.name, scheduleLabel(c)].filter(Boolean).join('. ')}</p>
      <div className="course-standing">
        {s.average !== null ? <span className="small"><b className="num">{s.average}</b> <span className="muted">average on {s.gradedWeight}% graded</span></span> : <span className="small muted">No grades yet</span>}
        <ProgressBar label={`${c.code} share of grade decided`} pct={s.totalWeight ? Math.round((s.gradedWeight / s.totalWeight) * 100) : 0} />
      </div>
      <p className="xs course-next">{next ? <><span className="muted">Next:</span> {next.title}, {whenWord(next.due!, today)}</> : <span className="muted">No upcoming deadlines</span>}</p>
    </article>
  )
}

export function KeyDateItem({ item: k, action }: { item: KeyDate; action?: ReactNode }) {
  const today = D.today()
  const n = D.diffDays(k.date, today)
  const icon = KEY_DATE_KINDS.find(([kind]) => kind === k.kind)?.[2] ?? 'calendar'
  return (
    <li className={n < 0 ? 'is-past' : ''}>
      <DateChip date={k.date} />
      <span className="mini-main">
        <span className="mini-title"><Icon className="icon-sm" name={icon} /> {k.title}</span>
        <span className="xs muted">{D.long(k.date)}{n >= 0 ? `, ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`}` : ''}{k.note ? `. ${k.note}` : ''}</span>
      </span>
      {action}
    </li>
  )
}

/* ---- Courses ---------------------------------------------------------------------------- */
function CourseList() {
  const { data } = useHop()
  const editors = useEditors()
  if (!data.courses.length) return <Empty action={() => editors.course()} actionLabel="Add a course" body="Add courses you’re taking, ones you plan to take, and ones you’re only curious about." title="No courses yet" />
  const groups: [string, Course[]][] = [
    ['This term', data.courses.filter((c) => c.status === 'taking')],
    ['Next term and interested', data.courses.filter((c) => c.status === 'planned' || c.status === 'interested')],
    ['Completed', data.courses.filter((c) => c.status === 'completed')],
  ]
  return (
    <>
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <section className="section" key={label}>
          <h2 className="group-label">{label} <span className="count">{list.length}</span></h2>
          <div className="rows">
            {[...list].sort((a, b) => a.code.localeCompare(b.code)).map((c) => {
              const instructor = data.contacts.find((p) => p.id === c.instructorId)
              const term = data.terms.find((t) => t.id === c.termId)
              const materials = data.resources.filter((r) => r.courseId === c.id).length
              return (
                <div className="row row-link" key={c.id}>
                  <span className="code">{c.code}</span>
                  <div className="row-main">
                    <a className="row-open" href={`#/itu/courses/${c.id}`}>{c.name}</a>
                    <div className="row-meta">
                      {instructor && <span><Icon name="user" />{instructor.name}</span>}
                      {term && <span>{term.name}</span>}
                      <span><Icon name="library" />{plural(materials, 'resource')}</span>
                      {c.why && <span className="why">{c.why}</span>}
                    </div>
                  </div>
                  {c.grade && <span aria-label={`Grade ${c.grade}`} className="grade">{c.grade}</span>}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

/* ---- Handbook ----------------------------------------------------------------------------- */
function Handbook() {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const today = D.today()
  const ahead = data.keyDates.filter((k) => k.date >= today)
  const past = data.keyDates.filter((k) => k.date < today).reverse()

  return (
    <>
      <Banner icon="info" tone="info">Copy official dates from the <a href="https://www.sis.itu.edu.tr" rel="noopener noreferrer" target="_blank">SIS academic calendar</a>. Deadlines here show up in Today, Plan and notifications.</Banner>
      <div className="split">
        <section aria-labelledby="kd2-h" className="section">
          <div className="section-head"><h2 id="kd2-h">Key dates</h2></div>
          {ahead.length
            ? <ul className="key-dates key-dates-lg">{ahead.map((k) => <KeyDateItem action={<span className="row-actions"><Menu items={[{ label: 'Delete', icon: 'trash', onSelect: () => void actions.handbook.removeDate(k), danger: true }]} label={`Actions for ${k.title}`} /></span>} item={k} key={k.id} />)}</ul>
            : <p className="small muted">No upcoming dates. Add registration, withdrawal and exam periods from the academic calendar.</p>}
          {past.length > 0 && <details className="done-list"><summary>Past <span className="count">{past.length}</span></summary><ul className="key-dates">{past.map((k) => <KeyDateItem item={k} key={k.id} />)}</ul></details>}
        </section>
        <aside className="stack">
          <section aria-labelledby="ln-h" className="section">
            <div className="section-head"><h2 id="ln-h">Links</h2><button className="link-btn small" onClick={() => editors.uniLink()} type="button">Add</button></div>
            {data.uniLinks.length
              ? (
                <ul className="link-list">
                  {data.uniLinks.map((link) => (
                    <li key={link.id}>
                      <a href={link.url} rel="noopener noreferrer" target="_blank"><Icon className="icon-sm" name="external" />{link.title}</a>
                      <span className="xs muted">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      <button aria-label={`Remove ${link.title}`} className="link-btn xs" onClick={() => void actions.handbook.removeLink(link)} type="button">Remove</button>
                    </li>
                  ))}
                </ul>
              )
              : <p className="small muted">SIS, Ninova, your department’s page: the places you open every week.</p>}
          </section>
        </aside>
      </div>
      <section aria-labelledby="pn-h" className="section">
        <div className="section-head"><h2 id="pn-h">Pinned info</h2><button className="btn btn-sm" onClick={() => editors.pin()} type="button"><Icon className="icon-sm" name="pin" />Pin something</button></div>
        {data.pins.length
          ? (
            <div className="pin-grid">
              {data.pins.map((p) => (
                <article className="panel panel-pad pin" key={p.id}>
                  <div className="pin-head">
                    <span className="pin-icon"><Icon className="icon-sm" name={PIN_KINDS.find(([kind]) => kind === p.kind)?.[2] ?? 'pin'} /></span>
                    <h3>{p.title}</h3>
                    <Menu items={[{ label: 'Edit', icon: 'edit', onSelect: () => editors.pin(p) }, { label: 'Unpin', icon: 'trash', onSelect: () => void actions.handbook.removePin(p), danger: true }]} label={`Actions for ${p.title}`} />
                  </div>
                  {p.body && <p className="small">{p.body}</p>}
                </article>
              ))}
            </div>
          )
          : <p className="small muted">Rules, offices and tips you look up more than once: VF rules, attendance, where to take a form.</p>}
      </section>
    </>
  )
}
